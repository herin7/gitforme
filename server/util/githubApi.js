const axios = require('axios');
const User = require('../models/UserModel');


exports.createGithubApi = async (session) => {
    const headers = { 
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitForMe-App' 
    };

    if (session?.userId) {
        try {
            const user = await User.findById(session.userId);
            if (user?.githubAccessToken) {
                headers['Authorization'] = `token ${user.githubAccessToken}`;
                console.log(`[GitHub API] 🔑 Authenticated request for user: ${user.username}`);
                return axios.create({
                    baseURL: 'https://api.github.com',
                    headers,
                    timeout: 30000
                });
            }
        } catch (error) {
            console.error(`[GitHub API] ❌ Error fetching user for token: ${error.message}`);
        }
    }

    console.log('[GitHub API] 🌐 Unauthenticated request (fallback)');
    return axios.create({
        baseURL: 'https://api.github.com',
        headers,
        timeout: 30000
    });
};
