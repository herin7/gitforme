const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

exports.requireAuth = (req, res, next) => {
    if (req.session?.userId) {
        return next();
    } else {
        return res.status(401).json({ message: "Unauthorized: You must be logged in to view this content." });
    }
};

exports.verifyToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ status: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
        return res.status(401).json({ status: false, message: 'Invalid token.' });
    }
    next(); 
  } catch (ex) {
    console.error('Token verification error:', ex);
    res.status(400).json({ status: false, message: 'Invalid token.' });
  }
};
