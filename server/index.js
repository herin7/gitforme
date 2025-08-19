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
//added the route here
const statsRoute = require('./Routes/StatsRoute');
const { requireAuth } = require("./Middlewares/AuthMiddleware");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./docs/swagger.json");

const PORT = process.env.PORT || 3000;
const app = express();
app.set('trust proxy', 1); 
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));
const redisStore = new RedisStore({ client: redisClient, prefix: "session:" });
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
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// 2. Body Parsers
app.use(express.json());
app.use(cookieParser());

// 3. Session Management
const isProduction = process.env.NODE_ENV === 'production';
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
      // Enhanced browser compatibility
      sameSite: isProduction ? 'none' : 'lax', // 'none' for production (cross-site), 'lax' for development
      domain: isProduction ? '.gitforme.tech' : undefined, // Allow cookies across subdomains in production
      // Additional flags for browser compatibility
      path: '/', // Ensure cookie is available across all paths
    },
  })
);

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URL, {})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// --- API Routes ---
app.use("/api/auth", authRoute);
//Status route added
app.use("/api/stats", statsRoute);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/github", requireAuth);

app.use("/api/github", insightsRoutes);
app.use("/api/github", repoRoute);     

// Serve Swagger UI Docs...
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
// const PORT = process.env.PORT || 3000;
// --- Server Start ---
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
