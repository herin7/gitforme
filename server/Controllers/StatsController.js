// server/Controllers/StatsController.js

const User = require('../models/UserModel');
const redisClient = require('../util/RediaClient');

/**
 * Gets the total count of registered users.
 * The result is cached in Redis for 1 hour to reduce database load.
 * This endpoint is public and used for display on the landing page.
 * @route GET /api/stats/user-count
 * @access Public
 */

exports.getUserCount = async (req, res) => {
    const cacheKey = 'stats:user_count';

    try {
        // 1. Check Redis Cache First
        const cachedCount = await redisClient.get(cacheKey);
        if (cachedCount) {
            console.log("Cache hit for user count.");
            return res.json(JSON.parse(cachedCount));
        }

        // 2. If not in cache, query the database
        console.log("Cache miss for user count. Querying database.");
        const count = await User.countDocuments();
        const data = { count };

        // 3. Store the result in Redis with a 1-hour expiration (3600 seconds)
        await redisClient.set(cacheKey, JSON.stringify(data), {
            EX: 3600, 
        });

        res.json(data);

    } catch (error) {
        console.error("Failed to fetch user count:", error);
        res.status(500).json({ message: "Error fetching user count." });
    }
};