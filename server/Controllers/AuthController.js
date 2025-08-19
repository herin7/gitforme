// server/Controllers/AuthController.js
const User = require('../models/UserModel');
const axios = require('axios');
const config = require('../config/envconfig');

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

        // Generate JWT token for fallback authentication
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { userId: user._id }, 
            process.env.TOKEN_SECRET, 
            { expiresIn: '24h' }
        );

        // Redirect to appropriate frontend with token
        res.redirect(`${config.frontendUrl}/?token=${token}&success=true`);

    } catch (error) {
        console.error('Error during GitHub authentication:', error.message);
        res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
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