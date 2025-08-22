const axios = require('axios');
const redisClient = require('../util/RediaClient');
const User = require('../models/UserModel');

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    'Accept': 'application/vnd.github.v3+json',
  },
});

// Utility to robustly strip .git from repo names
function stripGitSuffix(name) {
  if (typeof name === 'string' && name.toLowerCase().endsWith('.git')) {
    return name.slice(0, -4);
  }
  return name;
}

exports.fetchReadme = async (req, res) => {
  const { username } = req.params;
  let { reponame } = req.params;
  reponame = stripGitSuffix(reponame);

  try {
    const githubApi = await createGithubApi(req.session);
    const response = await githubApi.get(
      `/repos/${username}/${reponame}/readme`
    );
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res
      .status(status)
      .json({ message: 'Error fetching README from GitHub.' });
  }
};

exports.fetchRepoDetails = async (req, res) => {
  const { username } = req.params;
  let { reponame } = req.params;

  if (reponame.endsWith('.git')) {
    reponame = reponame.slice(0, -4);
  }

  const cacheKey = `repo:${username}:${reponame}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

    const githubApi = await createGithubApi(req.session);
    const response = await githubApi.get(
      `/repos/${username}/${reponame}`
    );

    await redisClient.set(cacheKey, JSON.stringify(response.data), {
      EX: 3600,
    });

    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res
      .status(status)
      .json({ message: 'Error fetching repository data from GitHub.' });
  }
};

const createGithubApi = async (session) => {
  const headers = { Accept: 'application/vnd.github.v3+json' };

  if (session?.userId) {
    const user = await User.findById(session.userId);
    if (user?.githubAccessToken) {
      headers['Authorization'] = `token ${user.githubAccessToken}`;
      console.log(
        `Making authenticated GitHub API request for user ${user.username}.`
      );
      return axios.create({ baseURL: 'https://api.github.com', headers });
    }
  }

  console.log('Making unauthenticated GitHub API request (fallback).');
  return axios.create({ baseURL: 'https://api.github.com', headers });
};

