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
const PORT = process.env.PORT || 3000;
const app = express();
app.set('trust proxy', 1); 
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));
const redisStore = new RedisStore({ client: redisClient, prefix: "session:" });
const allowedOrigins = [
  'https://www.gitforme.tech',
  'https://gitforme-jbsp.vercel.app',
  'https://gitforme-bot.onrender.com',
  // 'http://localhost:5173',
  // 'http://localhost:5173/',
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy: ${origin} not allowed`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// 2. Body Parsers
app.use(express.json());
app.use(cookieParser());

// 3. Session Management
app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, //disable in dev mode
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, 
      sameSite: 'none', //disable in dev mode
      // sameSite: 'lax', //Use this in dev mode 
    },
  })
);

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URL, {})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// --- API Routes ---
app.use((req, res, next) => {
  console.log('Incoming cookies:', req.cookies);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  next();
});

app.use("/api/auth", authRoute);
//Status route added
app.use("/api/stats", statsRoute);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/github", requireAuth);

app.use("/api/github", insightsRoutes);
app.use("/api/github", repoRoute);     

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.clearCookie('token'); 
    res.json({ status: true });
  });
});

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
// const PORT = process.env.PORT || 3000;
// --- Server Start ---
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
