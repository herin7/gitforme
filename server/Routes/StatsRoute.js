const router = require('express').Router();
const { getUserCount } = require('../Controllers/StatsController');

/**
 * @swagger
 * /api/stats/user-count:
 *   get:
 *     description: Returns the total number of users.
 *     responses:
 *       200:
 *         description: User count retrieved
 *       500:
 *         description: Error fetching user count.
 */
router.get('/user-count', getUserCount);

module.exports = router;
