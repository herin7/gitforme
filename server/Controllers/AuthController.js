const config = require('../config/envconfig.js');
const User = require('../models/UserModel');
const axios = require('axios');
const jwt = require('jsonwebtoken');

exports.githubCallback = async (req, res) => {
    const { code } = req.query;
    if (!code) {
        console.warn('[GitHub OAuth] No authorization code received.');
        return res.status(400).send('Error: No authorization code received.');
    }

    try {
        console.log('[GitHub OAuth] Step 1: Exchanging code for access token...');
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            },
            { headers: { Accept: 'application/json' } }
        );

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
            console.error('[GitHub OAuth] Failed to retrieve access token.');
            return res.status(500).send('Error: Could not retrieve access token.');
        }
        console.log('[GitHub OAuth] ✅ Access token received.');

        console.log('[GitHub OAuth] Step 2: Fetching user info from GitHub...');
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` },
        });
        const githubUser = userResponse.data;
        console.log(`[GitHub OAuth] ✅ User fetched: ${githubUser.login} (ID: ${githubUser.id})`);

        console.log('[GitHub OAuth] Step 3: Checking if user exists in DB...');
        let user = await User.findOne({ githubId: githubUser.id });

        if (!user) {
            console.log('[GitHub OAuth] New user. Creating in database...');
            user = await User.create({
                githubId: githubUser.id,
                username: githubUser.login,
                email: githubUser.email || `${githubUser.login}@users.noreply.github.com`,
                githubAccessToken: accessToken,
            });
            console.log(`[GitHub OAuth] ✅ User created: ${user.username}`);
        } else {
            console.log('[GitHub OAuth] Existing user found. Updating access token...');
            user.githubAccessToken = accessToken;
            await user.save();
            console.log('[GitHub OAuth] ✅ User updated.');
        }

        console.log('[GitHub OAuth] Step 4: Creating session...');
        req.session.userId = user._id;

        console.log('[GitHub OAuth] Step 5: Creating fallback JWT token...');
        const fallbackToken = jwt.sign(
            { userId: user._id },
            process.env.TOKEN_SECRET,
            { expiresIn: '1d' }
        );
        console.log('[GitHub OAuth] ✅ JWT created.');

        console.log('[GitHub OAuth] Step 6: Redirecting user to frontend...');
        res.redirect(`${config.frontendUrl}?success=true&token=${fallbackToken}`);

    } catch (error) {
        console.error('[GitHub OAuth] ❌ Error during authentication:', error.message);
        const redirectUrl = config ? `${config.frontendUrl}/login?error=auth_failed` : '/login?error=auth_failed';
        res.redirect(redirectUrl);
    }
};

exports.verifyUser = async (req, res) => {
    console.log('[VerifyUser] Checking session...');
    if (req.session?.userId) {
        try {
            const user = await User.findById(req.session.userId).select('-password -githubAccessToken');
            if (user) {
                console.log(`[VerifyUser] ✅ Session valid for user: ${user.username}`);
                return res.json({ status: true, user });
            }
        } catch (error) {
            console.error("[VerifyUser] ❌ Error:", error);
        }
    }
    console.warn('[VerifyUser] No active session.');
    return res.json({ status: false, message: "No active session." });
};

exports.verifyToken = async (req, res) => {
    console.log('[VerifyToken] Checking provided token...');
    try {
        const { token } = req.body;
        if (!token) {
            console.warn('[VerifyToken] No token provided.');
            return res.status(401).json({ status: false, message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
        console.log(`[VerifyToken] ✅ Token valid. UserId: ${decoded.userId}`);

        const user = await User.findById(decoded.userId).select('-password -githubAccessToken');
        if (!user) {
            console.warn('[VerifyToken] ❌ Invalid token: User not found.');
            return res.status(401).json({ status: false, message: 'Invalid token' });
        }

        console.log('[VerifyToken] ✅ User verified, re-establishing session...');
        req.session.userId = user._id;

        res.json({ status: true, user });
    } catch (error) {
        console.error('[VerifyToken] ❌ Invalid token:', error.message);
        res.status(401).json({ status: false, message: 'Invalid token' });
    }
};
