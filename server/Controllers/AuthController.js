// server/Controllers/AuthController.js
const config = require('../config/envconfig.js');
const User = require('../models/UserModel');
const axios = require('axios');
const jwt = require('jsonwebtoken'); 

exports.githubCallback = async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Error: No authorization code received.');
    }

    try {
        // Exchange code for access token
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
        }, { headers: { Accept: 'application/json' } });

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
            return res.status(500).send('Error: Could not retrieve access token.');
        }

        // Get user info from GitHub
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` },
        });
        const githubUser = userResponse.data;

        // Find or create user in your database
        let user = await User.findOne({ githubId: githubUser.id });
        if (!user) {
            user = await User.create({
                githubId: githubUser.id,
                username: githubUser.login,
                email: githubUser.email || `${githubUser.login}@users.noreply.github.com`,
                githubAccessToken: accessToken,
            });
        } else {
            user.githubAccessToken = accessToken;
            await user.save();
        }

        // Create session
        req.session.userId = user._id;

        // Redirect to appropriate frontend with token
        res.redirect(config.frontendUrl);

    } catch (error) {
       console.error('Error during GitHub authentication:', error.message);
        // Ensure config is available even in the catch block
        const redirectUrl = config ? `${config.frontendUrl}/login?error=auth_failed` : '/login?error=auth_failed';
        res.redirect(redirectUrl);
    }
};

exports.verifyUser = async (req, res) => {
    if (req.session?.userId) {
        try {
            const user = await User.findById(req.session.userId).select('-password -githubAccessToken');
            if (user) {
                return res.json({ status: true, user });
            }
        } catch (error) {
            console.error("Error in verifyUser:", error);
        }
    }
    return res.json({ status: false, message: "No active session." });
};

// Add token verification endpoint for fallback
exports.verifyToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(401).json({ status: false, message: 'No token provided' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
        const user = await User.findById(decoded.userId).select('-password -githubAccessToken');
        
        if (!user) {
            return res.status(401).json({ status: false, message: 'Invalid token' });
        }

        res.json({ status: true, user });
    } catch (error) {
        res.status(401).json({ status: false, message: 'Invalid token' });
    }
};