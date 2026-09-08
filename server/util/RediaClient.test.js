// Run: node --test server/util/RediaClient.test.js
// Guards the regression where a disabled Redis turned every cached GitHub
// route into an HTTP 500: callers do `await redisClient.get(key)` unguarded,
// so a throwing client landed in their catch block, where a non-HTTP error
// fell through `error.response?.status || 500`.

const test = require('node:test');
const assert = require('node:assert');

test('without REDIS_URL the client degrades to a cache miss', async () => {
    delete process.env.REDIS_URL;
    delete require.cache[require.resolve('./RediaClient')];
    const redisClient = require('./RediaClient');

    assert.strictEqual(redisClient.isReady, false);
    assert.strictEqual(await redisClient.get('repo:herin7:gitforme'), null);
    await redisClient.set('repo:herin7:gitforme', '{}', { EX: 3600 });
    redisClient.on('error', () => {});
});
