const axios = require('axios');
const User = require('../models/UserModel');

/**
 * Creates an authenticated or unauthenticated GitHub API client based on session
 * @param {Object} session - Express session object containing userId
 * @returns {Promise<Object>} Axios instance configured for GitHub API
 */
const createGithubApi = async (session) => {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  
  if (session?.userId) {
    try {
      const user = await User.findById(session.userId);
      if (user?.githubAccessToken) {
        headers['Authorization'] = `token ${user.githubAccessToken}`;
        console.log(`Making authenticated GitHub API request for user ${user.username}.`);
        return axios.create({ baseURL: 'https://api.github.com', headers });
      }
    } catch (dbError) {
      console.error("Error fetching user for authenticated API call:", dbError.message);
    }
  }
  
  console.log('Making unauthenticated GitHub API request (fallback).');
  return axios.create({ baseURL: 'https://api.github.com', headers });
};

module.exports = { createGithubApi };
