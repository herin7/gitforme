const axios = require('axios');
const User = require('../models/UserModel');
const redisClient = require('../util/RediaClient');
const { Octokit } = require("@octokit/rest");


const createGithubApi = async (session) => {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  
  if (session?.userId) {
    const user = await User.findById(session.userId);
    if (user?.githubAccessToken) {
      headers['Authorization'] = `token ${user.githubAccessToken}`;
      console.log(`Making authenticated GitHub API request for user ${user.username}.`);
      return axios.create({ baseURL: 'https://api.github.com', headers });
    }
  }
  
  console.log('Making unauthenticated GitHub API request (fallback).');
  return axios.create({ baseURL: 'https://api.github.com', headers });
};

exports.getRepoTimeline = async (req, res) => {
  const { username, reponame } = req.params;
  const userId = req.session.userId || 'public';
  const cacheKey = `repo:timeline:${userId}:${username}:${reponame}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for timeline of ${username}/${reponame} for user ${userId}`);
      return res.json(JSON.parse(cachedData));
    }

    const githubApi = await createGithubApi(req.session);

    // 1. Fetch all branches
    const { data: branchesData } = await githubApi.get(`/repos/${username}/${reponame}/branches`);
    
    // 2. Fetch all tags
    const { data: tagsData } = await githubApi.get(`/repos/${username}/${reponame}/tags`);

    // 3. Fetch commits (limit to 500 using per_page and pagination)
    const commits = [];
    let page = 1;
    const perPage = 100;

    while (commits.length < 500) {
      const { data: pageCommits } = await githubApi.get(`/repos/${username}/${reponame}/commits`, {
        params: { per_page: perPage, page },
      });
      if (pageCommits.length === 0) break;
      commits.push(...pageCommits);
      if (pageCommits.length < perPage) break;
      page++;
    }

    // Map tags to SHAs
    const tagMap = {};
    for (const tag of tagsData) {
      tagMap[tag.commit.sha] = tag.name;
    }

    const processedCommits = commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        login: commit.author ? commit.author.login : commit.commit.author.name,
        avatar_url: commit.author ? commit.author.avatar_url : null,
      },
      date: commit.commit.author.date,
      parents: commit.parents.map(p => p.sha),
      tag: tagMap[commit.sha] || null,
    }));

    const responsePayload = {
      commits: processedCommits,
      branches: branchesData.map(b => ({ name: b.name, sha: b.commit.sha })),
      tags: tagsData.map(t => ({ name: t.name, sha: t.commit.sha })),
    };

    await redisClient.set(cacheKey, JSON.stringify(responsePayload), { EX: 3600 });
    res.json(responsePayload);

  } catch (error) {
    console.error("Error fetching repo timeline data:", error);
    const status = error.response?.status || 500;
    res.status(status).json({ message: "Failed to fetch repository timeline data from GitHub." });
  }
};


exports.fetchCodeHotspots = async (req, res) => {
    const { username, reponame } = req.params;
    const userId = req.session.userId || 'public';
    const cacheKey = `repo:hotspots:${userId}:${username}:${reponame}`;
    
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`Cache hit for hotspots: ${username}/${reponame}`);
        return res.json(JSON.parse(cachedData));
      }
      
      const githubApi = await createGithubApi(req.session);
      const commitsResponse = await githubApi.get(`/repos/${username}/${reponame}/commits`, {
        params: { per_page: 100 }
      });
      
      const commitDetailsPromises = commitsResponse.data.map(commit => 
            githubApi.get(commit.url)
          );
          const commitDetails = await Promise.all(commitDetailsPromises);
          
          const fileChurn = new Map();
          commitDetails.forEach(commitDetail => {
            if (commitDetail.data.files) {
              commitDetail.data.files.forEach(file => {
                fileChurn.set(file.filename, (fileChurn.get(file.filename) || 0) + 1);
              });
            }
          });
          
          const hotspots = Array.from(fileChurn, ([path, churn]) => ({ path, churn }))
          .sort((a, b) => b.churn - a.churn);
          
          await redisClient.set(cacheKey, JSON.stringify(hotspots), { EX: 3600 });
          res.json(hotspots);
          
        } catch (error) {
          console.error("Error fetching code hotspots:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ message: "Error fetching code hotspots from GitHub." });
      }
    };

    exports.fetchIssueTimeline = async (req, res) => {
    const { username, reponame, issue_number } = req.params;
    const userId = req.session.userId || 'public';
    const cacheKey = `issue:timeline:${userId}:${username}:${reponame}:${issue_number}`;
    
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
            console.log(`Cache hit for issue timeline: #${issue_number}`);
            return res.json(JSON.parse(cachedData));
          }
          
          const githubApi = await createGithubApi(req.session);
          const timelineResponse = await githubApi.get(`/repos/${username}/${reponame}/issues/${issue_number}/timeline`, {
            headers: { 'Accept': 'application/vnd.github.mockingbird-preview+json' }
          });
          
          await redisClient.set(cacheKey, JSON.stringify(timelineResponse.data), { EX: 1800 });
          res.json(timelineResponse.data);
          
        } catch (error) {
          console.error("Error fetching issue timeline:", error.response?.data || error.message);
          res.status(error.response?.status || 500).json({ message: "Error fetching issue timeline from GitHub." });
        }
      };

      exports.fetchFileCommits = async (req, res) => {
        const { username, reponame } = req.params;
        const { path } = req.query;
        
        if (!path) {
          return res.status(400).json({ message: 'A file path query parameter is required.' });
        }
        
        const userId = req.session.userId || 'public';
        const cacheKey = `repo:commits:${userId}:${username}:${reponame}:${path}`;
        
        try {
          const cachedCommits = await redisClient.get(cacheKey);
          if (cachedCommits) {
            console.log(`Cache hit for commits on file: ${path}`);
            return res.json(JSON.parse(cachedCommits));
          }
          
          const githubApi = await createGithubApi(req.session);
          const response = await githubApi.get(`/repos/${username}/${reponame}/commits`, {
            params: { path: path }
    });

    await redisClient.set(cacheKey, JSON.stringify(response.data), { EX: 3600 });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching file commits:", error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ message: "Error fetching file commit history from GitHub." });
  }
};

exports.fetchRepoDetails = async (req, res) => {
  const { username, reponame } = req.params;
  const userId = req.session.userId || 'public';
  const cacheKey = `repo:contributors:${userId}:${username}:${reponame}`;
  
  try {
    const cachedData = await redisClient.get(cacheKey); 
    if (cachedData) {
      console.log(`Cache hit for repo: ${username}/${reponame} for user: ${userId}`);
      return res.json(JSON.parse(cachedData));
    }
    
    const githubApi = await createGithubApi(req.session);
    const response = await githubApi.get(`/repos/${username}/${reponame}`);
    
    await redisClient.set(cacheKey, JSON.stringify(response.data), { EX: 3600 });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ message: 'Error fetching repository data from GitHub.' });
  }
};

exports.fetchPullRequests = async (req, res) => {
  const { username, reponame } = req.params;
  const githubApi = await createGithubApi(req.session);
  try {
    const { data } = await githubApi.get(`/repos/${username}/${reponame}/pulls`, {
      params: {
        state: 'all',
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      }
    });
    res.json(data);
  } catch (error) {
    console.error("Error fetching pull requests:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ message: "Error fetching pull requests." });
  }
};

exports.fetchGitTree = async (req, res) => {
  let { username, reponame, branch } = req.params;
  const userId = req.session.userId || 'public';
  const cacheKey = `repo:tree:${userId}:${username}:${reponame}:${branch || 'default'}`;
  try {
    const cachedTree = await redisClient.get(cacheKey);
    if (cachedTree) return res.json(JSON.parse(cachedTree));
    
    const githubApi = await createGithubApi(req.session);
    const repoRes = await githubApi.get(`/repos/${username}/${reponame}`);
    const defaultBranch = repoRes.data.default_branch;
    
    if (!branch) branch = defaultBranch;
    
    const branchInfo = await githubApi.get(`/repos/${username}/${reponame}/branches/${branch}`);
    const treeSha = branchInfo.data.commit.commit.tree.sha;
    
    const treeRes = await githubApi.get(`/repos/${username}/${reponame}/git/trees/${treeSha}?recursive=1`);
    
    await redisClient.set(cacheKey, JSON.stringify(treeRes.data), { EX: 3600 });
    res.json(treeRes.data);
  } catch (error) {
    console.error("Error fetching Git tree:", error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ message: "Error fetching Git tree from GitHub." });
  }
};

exports.fetchContributors = async (req, res) => {
  const { username, reponame } = req.params;
  const cacheKey = `repo:contributors:${username}:${reponame}`;
  
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));
    
    const githubApi = await createGithubApi(req.session);
    const response = await githubApi.get(`/repos/${username}/${reponame}/contributors`);
    
    await redisClient.set(cacheKey, JSON.stringify(response.data), { EX: 3600 });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    console.error("Error fetching contributors:", error.response?.data || error.message);
    res.status(status).json({ message: "Error fetching contributors from GitHub." });
  }
};

exports.fetchRepoFileContents = async (req, res) => {
  const { username, reponame, path } = req.params;
  
  try {
    const githubApi = await createGithubApi(req.session);
    const response = await githubApi.get(`/repos/${username}/${reponame}/contents/${path}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching file content:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ message: 'Error fetching file content from GitHub.' });
  }
};
exports.fetchFileContent = async (req, res) => {
  // Get the path parameter and join any additional path segments
  const filePath = req.params.path || '';
  const additionalPath = req.params[0] || ''; // For wildcard matches
  const fullPath = [filePath, additionalPath].filter(Boolean).join('/');
  
  // Rest of your code remains the same
  const { username, reponame } = req.params;
  
  if (!fullPath) {
    return res.status(400).json({ message: "A file path is required." });
  }
  
  try {
    const githubApi = await createGithubApi(req.session);

    const response = await githubApi.get(`/repos/${username}/${reponame}/contents/${fullPath}`, {
      headers: { Accept: 'application/vnd.github.v3.raw' }
    });

    res.json({
      content: response.data,
      fileName: fullPath,
      fileUrl: `https://github.com/${username}/${reponame}/blob/HEAD/${fullPath}`
    });

  } catch (error) {
    console.error("Error fetching file content:", error.response?.data || error.message);
    const status = error.response?.status || 500;
    const errorMsg = error.response?.data?.message || "Failed to fetch file content.";
    res.status(status).json({ message: errorMsg });
  }
};
exports.fetchIssues = async (req, res) => {
  const { username, reponame } = req.params;
  const userId = req.session.userId || 'public';
  const cacheKey = `repo:issues:${userId}:${username}:${reponame}`;
  
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for issues: ${username}/${reponame}`);
      return res.json(JSON.parse(cachedData));
    }
    
    const githubApi = await createGithubApi(req.session);
    const [openIssuesRes, closedIssuesRes] = await Promise.all([
      githubApi.get(`/repos/${username}/${reponame}/issues`, { params: { state: 'open', per_page: 50 } }),
      githubApi.get(`/repos/${username}/${reponame}/issues`, { params: { state: 'closed', per_page: 50 } })
    ]);
    
    const issuesData = {
      open: openIssuesRes.data,
      closed: closedIssuesRes.data
    };

    await redisClient.set(cacheKey, JSON.stringify(issuesData), { EX: 1800 });
    res.json(issuesData);
    
  } catch (error) {
    console.error("Error fetching issues:", error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ message: "Error fetching issues from GitHub." });
  }
};

exports.fetchDeployments = async (req, res) => {
  const { username, reponame } = req.params;
  const userId = req.session.userId || 'public';
  const cacheKey = `repo:deployments:${userId}:${username}:${reponame}`;
  
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for deployments: ${username}/${reponame}`);
      return res.json(JSON.parse(cachedData));
    }
    
    const githubApi = await createGithubApi(req.session);
    const deploymentsResponse = await githubApi.get(`/repos/${username}/${reponame}/deployments`);
    const deployments = deploymentsResponse.data;
    
    if (!deployments || deployments.length === 0) {
      return res.json([]);
    }
    
    const statusPromises = deployments.map(deployment => 
      githubApi.get(deployment.statuses_url).then(statusResponse => ({
        ...deployment,
        statuses: statusResponse.data
      }))
    );
    
    const deploymentsWithStatuses = await Promise.all(statusPromises);
    
    const activeDeploymentUrls = new Map();
    deploymentsWithStatuses.forEach(deployment => {
      if (deployment.statuses && deployment.statuses.length > 0) {
        const latestSuccessStatus = deployment.statuses.find(
          status => status.state === 'success' && status.environment_url
        );
        
        if (latestSuccessStatus) {
          if (!activeDeploymentUrls.has(deployment.environment)) {
            activeDeploymentUrls.set(deployment.environment, {
              url: latestSuccessStatus.environment_url,
              environment: deployment.environment,
              createdAt: deployment.created_at,
            });
          }
        }
      }
    });
    
    const finalUrls = Array.from(activeDeploymentUrls.values());
    await redisClient.set(cacheKey, JSON.stringify(finalUrls), { EX: 3600 });
    res.json(finalUrls);
    
  } catch (error) {
    console.error("Error fetching deployments:", error.response?.data || error.message);
    const status = error.response?.status || 500;
    if (status === 404) return res.json([]);
    res.status(status).json({ message: "Error fetching deployments from GitHub." });
  }
};

exports.fetchRepoInsights = async (req, res) => {
  try {
    const { username, reponame } = req.params;
    const githubApi = await createGithubApi(req.session);
    const prs = await githubApi.get(`/repos/${username}/${reponame}/pulls`, {
      params: { state: 'closed', per_page: 100 }
    });

    const mergedPRs = prs.data.filter(pr => pr.merged_at);
    const averageMergeTime = calculateAverageMergeTime(mergedPRs);
    
    res.json({
      averageMergeTime,
      acceptanceRate: Math.round((mergedPRs.length / prs.data.length) * 100),
      totalClosed: prs.data.length,
      mergedCount: mergedPRs.length
    });
  } catch (error) {
    console.error("Error fetching pull request insights:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ message: "Error fetching pull request insights from GitHub." });
  }
};

function calculateAverageMergeTime(prs) {
  if (!prs.length) return null;
  const totalMs = prs.reduce((sum, pr) => {
    const createdAt = new Date(pr.created_at);
    const mergedAt = new Date(pr.merged_at);
    return sum + (mergedAt - createdAt);
  }, 0);
  return totalMs / prs.length;
}

exports.fetchGoodFirstIssues = async (req, res) => {
  const { username, reponame } = req.params;
  const userId = req.session.userId || 'public';
  const cacheKey = `repo:good-first-issues:${userId}:${username}:${reponame}`;
  
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for good-first-issues: ${username}/${reponame}`);
      return res.json(JSON.parse(cachedData));
    }
    
    const githubApi = await createGithubApi(req.session);
    const response = await githubApi.get(`/repos/${username}/${reponame}/issues`, {
      params: {
        labels: 'good first issue,help wanted',
        state: 'open'
      }
    });

    await redisClient.set(cacheKey, JSON.stringify(response.data), { EX: 1800 });
    res.json(response.data);

  } catch (error) {
    console.error("Error fetching good first issues:", error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ message: "Error fetching good first issues from GitHub." });
  }
};

