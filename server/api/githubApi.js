const axios = require('axios');
const redis = require('redis');
const redisClient = require('../util/RediaClient');
const User = require('../models/UserModel');

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    'Accept': 'application/vnd.github.v3+json',
  },
});

exports.fetchReadme = async (req, res) => {
  const { username, reponame } = req.params;

  try {
    const githubApi = await createGithubApi(req.session);
    const response = await githubApi.get(`/repos/${username}/${reponame}/readme`);
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ message: 'Error fetching README from GitHub.' });
  }
};

exports.fetchRepoDetails = async (req, res) => {
  const { username, reponame } = req.params;
  const cacheKey = `repo:${username}:${reponame}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

    const githubApi = await createGithubApi(req.session);
    const response = await githubApi.get(`/repos/${username}/${reponame}`);

    await redisClient.set(cacheKey, JSON.stringify(response.data), { EX: 3600 });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ message: 'Error fetching repository data from GitHub.' });
  }
};

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

exports.fetchUserReposController = async (req, res) => {
  const userId = req.session.userId;
  const cacheKey = `github:repos:${userId}`;

  try {
    const cachedRepos = await redisClient.get(cacheKey);
    if (cachedRepos) {
      console.log(`Cache hit for user ${userId} repos`);
      return res.json(JSON.parse(cachedRepos));
    }

    console.log(`Cache miss for user ${userId} repos`);

    const user = await User.findById(userId);
    if (!user?.githubAccessToken) {
      return res.status(403).json({ message: "GitHub account not linked or access token missing." });
    }

    const userToken = user.githubAccessToken;

    const response = await axios.get('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        Authorization: `token ${userToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const userRepos = response.data;

    await redisClient.set(cacheKey, JSON.stringify(userRepos), {
      EX: 3600,
    });

    res.json(userRepos);

  } catch (error) {
    console.error("Error fetching user repositories:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: "Failed to fetch repositories from GitHub.",
    });
  }
};
