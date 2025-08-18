const router = require('express').Router();
const { fetchDependencyHealth } = require('../Controllers/InsightController');

/**
 * @swagger
 * /api/github/{username}/{reponame}/insights/dependencies:
 *   get:
 *     description: Returns dependency health insights for the specified repository.
 *     responses:
 *       200:
 *         description: Dependency health insights retrieved
 *       500:
 *         description: Error fetching dependency health.
 */
router.get('/:username/:reponame/insights/dependencies', fetchDependencyHealth);

module.exports = router;
