
const router = require('express').Router();
const { getUserCount } = require('../Controllers/StatsController');

// This endpoint does not require authentication
router.get('/user-count', getUserCount);

module.exports = router;