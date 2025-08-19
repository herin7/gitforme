// server/index.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require("connect-redis").default;
const redisClient = require("./util/RediaClient"); 
const authRoute = require("./Routes/AuthRoute");
const repoRoute = require("./Routes/RepoRoutes");
const insightsRoutes = require('./Routes/InsightRoutes'); 
const statsRoute = require('./Routes/StatsRoute');
const { requireAuth } = require("./Middlewares/AuthMiddleware");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./docs/swagger.json");
const config = require("./config/envconfig");

const PORT = process.env.PORT || 3000;
const app = express();

// Trust proxy for production
app.set('trust proxy', config.isProduction ? 1 : 0);

// Redis configuration
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('✅ Connected to Redis'));
const redisStore = new RedisStore({ 
    client: redisClient, 
    prefix: config.redisPrefix 
});

// CORS configuration
const allowedOrigins = [
    config.frontendUrl,
    'https://gitforme.tech',
    'https://www.gitforme.tech',
    'https://gitforme-bot.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000',
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin in development
        if (!origin && !config.isProduction) {
            return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked: ${origin}`);
            callback(new Error(`CORS not allowed for origin: ${origin}`), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsers
app.use(express.json());
app.use(cookieParser());

// Session Management
app.use(
    session({
        store: redisStore,
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        proxy: config.isProduction,
        cookie: {
            secure: config.secure,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: config.sameSite,
            domain: config.cookieDomain
        },
    })
);

// Database Connection
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// API Routes
app.use("/api/auth", authRoute);
app.use("/api/stats", statsRoute);
app.get("/api/health", (req, res) => res.json({ 
    status: "ok", 
    environment: config.isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString()
}));

// Protected routes
app.use("/api/github", requireAuth);
app.use("/api/github", insightsRoutes);
app.use("/api/github", repoRoute);

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 404 Handler
app.use((req, res) => res.status(404).json({ 
    error: "Route not found",
    path: req.path 
}));

// Start server
app.listen(PORT, () => {
    console.log(`🎯 Server running on port ${PORT}`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
});