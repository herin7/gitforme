const User = require('../models/UserModel');
const axios = require('axios');

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

        // --- IMPORTANT: Session is created here ---
        // This is the primary way your app knows the user is logged in.
        req.session.userId = user._id;

        // Redirect back to the frontend
        // res.redirect('https://www.gitforme.tech/');
        res.redirect('http://localhost:5173/');

    } catch (error) {
        console.error('Error during GitHub authentication:', error.message);
        res.redirect('http://localhost:5173/login?error=auth_failed');
    }
};

// Modify verifyUser endpoint
exports.verifyUser = async (req, res) => {
  console.log('VerifyUser - Session:', req.session);
  if (req.session?.userId) {
    try {
      const user = await User.findById(req.session.userId).select('-password -githubAccessToken');
      if (user) {
        console.log('User found:', user);
        return res.json({ status: true, user });
      }
    } catch (error) {
      console.error("Error in verifyUser:", error);
    }
  }
  console.log('No valid session found');
  return res.json({ status: false, message: "No active session." });
};
