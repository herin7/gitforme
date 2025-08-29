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
const statsRoute = require('./Routes/StatsRoute');
const { requireAuth } = require("./Middlewares/AuthMiddleware");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./docs/swagger.json");
const config = require("./config/envconfig");
const PORT = process.env.PORT || 3000;

const app = express();

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
  'https://www.gitforme.tech',
  'https://gitforme.tech',
  'https://gitforme-jbsp.vercel.app',
  'https://gitforme-bot.onrender.com',
  'http://localhost:5173',
  'http://localhost:5173/',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin && !config.isProduction) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed for origin: ${origin}`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Forwarded-Proto', 'x-application'],
  exposedHeaders: ['Set-Cookie']
}));

// Body Parsers
app.use(express.json());
app.use(cookieParser());

// Session Management
app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: config.isProduction, // <-- Using value from config
    cookie: {
      secure: true,              // 🔑 Render uses HTTPS
      httpOnly: true,
      sameSite: "none",          // 🔑 Required for cross-site cookies
      maxAge: 1000 * 60 * 60 * 24
    },
  })
);

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URL, {})
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- API Routes ---
// app.use((req, res, next) => {
//     console.log('Incoming cookies:', req.cookies);
//     console.log('Session ID:', req.sessionID);
//     console.log('Session data:', req.session);
//     next();
// });

app.use("/api/auth", authRoute);
app.use("/api/stats", statsRoute);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Protected GitHub routes
app.use("/api/github", requireAuth);
app.use("/api/github", repoRoute); // This is the correct, non-conflicting setup

// Serve Swagger UI Docs...
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 404 Handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// --- Server Start ---
app.listen(PORT, () => console.log(`🎯 Server running on port ${PORT}`));
