require("dotenv").config()
const redis = require('redis');

const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => retries < 3 ? Math.min(retries * 500, 2000) : false
    }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('Redis connection unavailable; continuing with JWT fallback.');
    }
})();

module.exports = redisClient;
