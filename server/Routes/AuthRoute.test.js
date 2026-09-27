// Run: node --test server/Routes/AuthRoute.test.js
// Guards the regression where the frontend's JWT fallback (POST
// /api/auth/verifyToken) hit the 404 handler because the controller existed
// but was never mounted, so cross-site deployments that block the session
// cookie logged users out on every reload.

const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

const TOKEN_SECRET = 'test-only-secret';
process.env.TOKEN_SECRET = TOKEN_SECRET;

const authRoute = require('./AuthRoute');

function startApp() {
    const app = express();
    app.use(express.json());
    const sessions = [];
    app.use((req, res, next) => {
        req.session = {};
        sessions.push(req.session);
        next();
    });
    app.use('/api/auth', authRoute);
    app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
    return new Promise((resolve) => {
        const server = app.listen(0, () => resolve({ server, sessions, port: server.address().port }));
    });
}

async function postJson(port, path, body) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
}

test('POST /api/auth/verifyToken is registered', async (t) => {
    const { server, sessions, port } = await startApp();
    const originalFindById = User.findById;
    t.after(() => {
        User.findById = originalFindById;
        server.close();
    });

    const missing = await postJson(port, '/api/auth/verifyToken', {});
    assert.strictEqual(missing.status, 401);
    assert.strictEqual(missing.body.status, false);

    const invalid = await postJson(port, '/api/auth/verifyToken', { token: 'not-a-jwt' });
    assert.strictEqual(invalid.status, 401);

    const userId = '507f1f77bcf86cd799439011';
    User.findById = (id) => ({
        select: async () => (id === userId ? { _id: userId, username: 'octocat' } : null),
    });
    const token = jwt.sign({ userId }, TOKEN_SECRET, { expiresIn: '1m' });
    const valid = await postJson(port, '/api/auth/verifyToken', { token });
    assert.strictEqual(valid.status, 200);
    assert.strictEqual(valid.body.status, true);
    assert.strictEqual(valid.body.user.username, 'octocat');
    assert.strictEqual(sessions.at(-1).userId, userId);
});
