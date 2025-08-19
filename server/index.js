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

const PORT = process.env.PORT || 3000;
const app = express();

// Trust proxy for proper IP handling behind reverse proxies
app.set('trust proxy', 1); 

// Redis connection event handlers
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

const redisStore = new RedisStore({ client: redisClient, prefix: "session:" });

// Environment-aware allowed origins configuration
const allowedOrigins = [
  process.env.PRODUCTION_FRONTEND_URL || 'https://www.gitforme.tech',
  'https://gitforme.tech',
  'https://gitforme-jbsp.vercel.app',
  'https://gitforme-bot.onrender.com',
  ...(process.env.NODE_ENV === 'development' ? [
    process.env.DEVELOPMENT_FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173'
  ] : [])
];

// Enhanced CORS configuration for better browser compatibility
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy: ${origin} not allowed`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200 // Better legacy browser support than 204
}));

// Body parsers
app.use(express.json());
app.use(cookieParser());

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Enhanced session management with better browser compatibility
app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // HTTPS only in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: isProduction ? 'none' : 'lax', // Cross-site in prod, relaxed in dev
      domain: isProduction ? '.gitforme.tech' : undefined, // Subdomain support in production
      path: '/', // Ensure cookie availability across all paths
    },
  })
);

// Database connection
mongoose.connect(process.env.MONGO_URL, {})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Optional: Request logging middleware (remove in production if not needed)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log('Incoming cookies:', req.cookies);
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    next();
  });
}

// API Routes
app.use("/api/auth", authRoute);
app.use("/api/stats", statsRoute);

// Health check endpoint
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Protected GitHub routes
app.use("/api/github", requireAuth);
app.use("/api/github", insightsRoutes);
app.use("/api/github", repoRoute);

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 404 handler for unmatched routes
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Server startup
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed origins:`, allowedOrigins);
});