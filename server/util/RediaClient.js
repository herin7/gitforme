require("dotenv").config()
const redis = require('redis');

// Redis is optional. Without REDIS_URL we export a no-op client so every
// caller's `await redisClient.get(key)` simply misses the cache and falls
// through to the live source, instead of throwing into a catch block that
// reports the failure as an HTTP 500.
function createDisabledClient() {
    return {
        isReady: false,
        isDisabled: true,
        async get() { return null; },
        async set() { return undefined; },
        async del() { return 0; },
        async connect() { return undefined; },
        async quit() { return undefined; },
        on() { return this; },
    };
}

function createLiveClient() {
    const client = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
            connectTimeout: 10000,
            reconnectStrategy: (retries) => retries < 3 ? Math.min(retries * 500, 2000) : false
        }
    });

    client.on('error', (err) => console.error('Redis Client Error', err));

    (async () => {
        try {
            await client.connect();
        } catch (error) {
            console.error('Redis connection unavailable; continuing with JWT fallback.');
        }
    })();

    // Once the connection drops for good the client rejects every command, which
    // would turn a cache miss back into a 500. Degrade to a miss instead.
    const guard = (name) => {
        const original = client[name].bind(client);
        return async (...args) => {
            if (!client.isReady) return name === 'get' ? null : undefined;
            try {
                return await original(...args);
            } catch (error) {
                console.error(`Redis ${name} failed; serving without cache.`, error.message);
                return name === 'get' ? null : undefined;
            }
        };
    };
    client.get = guard('get');
    client.set = guard('set');

    return client;
}

module.exports = process.env.REDIS_URL ? createLiveClient() : createDisabledClient();
