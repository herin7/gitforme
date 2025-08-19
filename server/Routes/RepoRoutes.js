const router = require('express').Router();
const { fetchRepoDetails, fetchReadme } = require('../api/githubApi');
const {
    fetchGitTree,
    getRepoTimeline,
    fetchIssues,
    fetchRepoInsights,
    fetchPullRequests,
    fetchCodeHotspots,
    fetchIssueTimeline,
    fetchGoodFirstIssues,
    fetchContributors,
    fetchDeployments,
    fetchFileCommits,
    fetchRepoFileContents,
    
} = require('../Controllers/GithubController');

const { fetchDependencyHealth } = require('../Controllers/InsightController');

// router.get('/repos/:username/:reponame/file/*', fetchFileContent);
// router.get('/repos/:username/:reponame/file/*', fetchFileContent);

/**
 * @swagger
 * /api/github/repos/{username}/{reponame}/file/{path}:
 *   get:
 *     description: Returns the content of a file in the specified repository.
 *     responses:
 *       200:
 *         description: File content retrieved
 *       500:
 *         description: Failed to fetch file content.
 */
router.get('/repos/:username/:reponame/file/:path', fetchRepoFileContents);

/**
 * @swagger
 * /api/github/{username}/{reponame}/issues/{issue_number}/timeline:
 *   get:
 *     description: Returns the timeline of a specific issue in the repository.
 *     responses:
 *       200:
 *         description: Issue timeline retrieved
 *       500:
 *         description: Error fetching issue timeline from GitHub.
 */
router.get('/:username/:reponame/issues/:issue_number/timeline', fetchIssueTimeline);

/**
 * @swagger
 * /api/github/{username}/{reponame}/insights/dependencies:
 *   get:
 *     description: Returns dependency health insights for the specified repository.
 *     responses:
 *       200:
 *         description: Dependency health insights retrieved
 *       500:
 *         description: Error fetching dependency health.
 */
router.get('/:username/:reponame/insights/dependencies', fetchDependencyHealth);

/**
 * @swagger
 * /api/github/{username}/{reponame}:
 *   get:
 *     description: Returns details of the specified repository.
 *     responses:
 *       200:
 *         description: Repository details retrieved
 *       500:
 *         description: Error fetching repository data from GitHub.
 */
router.get('/:username/:reponame', fetchRepoDetails);

/**
 * @swagger
 * /api/github/{username}/{reponame}/readme:
 *   get:
 *     description: Returns the README file of the specified repository.
 *     responses:
 *       200:
 *         description: Repository README retrieved
 *       500:
 *         description: Error fetching README from GitHub.
 */
router.get('/:username/:reponame/readme', fetchReadme);

/**
 * @swagger
 * /api/github/{username}/{reponame}/commits:
 *   get:
 *     description: Returns the commit history for the specified repository.
 *     responses:
 *       200:
 *         description: File commits retrieved
 *       400:
 *         description: A file path query parameter is required.
 *       500:
 *         description: Error fetching file commit history from GitHub.
 */
router.get('/:username/:reponame/commits', fetchFileCommits);

/**
 * @swagger
 * /api/github/{username}/{reponame}/deployments:
 *   get:
 *     description: Returns deployment information for the specified repository.
 *     responses:
 *       200:
 *         description: Deployments retrieved
 *       500:
 *         description: Error fetching deployments from GitHub.
 *       404:
 *         description: Not Found
 */
router.get('/:username/:reponame/deployments', fetchDeployments);

/**
 * @swagger
 * /api/github/{username}/{reponame}/git/trees/{branch}:
 *   get:
 *     description: Returns the git tree for the specified branch in the repository.
 *     responses:
 *       200:
 *         description: Git tree retrieved
 *       500:
 *         description: Error fetching Git tree from GitHub.
 */
router.get('/:username/:reponame/git/trees/:branch', fetchGitTree);

/**
 * @swagger
 * /api/github/{username}/{reponame}/contributors:
 *   get:
 *     description: Returns the list of contributors for the specified repository.
 *     responses:
 *       200:
 *         description: Contributors retrieved
 *       500:
 *         description: Error fetching contributors from GitHub.
 */
router.get('/:username/:reponame/contributors', fetchContributors);

/**
 * @swagger
 * /api/github/{username}/{reponame}/issues:
 *   get:
 *     description: Returns the list of issues for the specified repository.
 *     responses:
 *       200:
 *         description: Issues retrieved
 *       500:
 *         description: Error fetching issues from GitHub.
 */
router.get('/:username/:reponame/issues', fetchIssues);

/**
 * @swagger
 * /api/github/{username}/{reponame}/pulls:
 *   get:
 *     description: Returns the list of pull requests for the specified repository.
 *     responses:
 *       200:
 *         description: Pull requests retrieved
 *       500:
 *         description: Error fetching pull requests.
 */
router.get('/:username/:reponame/pulls', fetchPullRequests);

/**
 * @swagger
 * /api/github/{username}/{reponame}/good-first-issues:
 *   get:
 *     description: Returns the list of good first issues for the specified repository.
 *     responses:
 *       200:
 *         description: Good first issues retrieved
 *       500:
 *         description: Error fetching good first issues from GitHub.
 */
router.get('/:username/:reponame/good-first-issues', fetchGoodFirstIssues);

/**
 * @swagger
 * /api/github/{username}/{reponame}/hotspots:
 *   get:
 *     description: Returns code hotspots for the specified repository.
 *     responses:
 *       200:
 *         description: Code hotspots retrieved
 *       500:
 *         description: Error fetching code hotspots from GitHub.
 */
router.get('/:username/:reponame/hotspots', fetchCodeHotspots);

/**
 * @swagger
 * /api/github/{username}/{reponame}/timeline:
 *   get:
 *     description: Returns the timeline of the specified repository.
 *     responses:
 *       200:
 *         description: Repository timeline retrieved
 *       500:
 *         description: Failed to fetch repository timeline data from GitHub.
 */
router.get('/:username/:reponame/timeline', getRepoTimeline);

/**
 * @swagger
 * /api/github/{username}/{reponame}/insights:
 *   get:
 *     description: Returns insights for the specified repository.
 *     responses:
 *       200:
 *         description: Repository insights retrieved
 *       500:
 *         description: Error fetching pull request insights from GitHub.
 */
router.get('/:username/:reponame/insights', fetchRepoInsights);

module.exports = router;