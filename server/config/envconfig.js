// server/config/envConfig.js
require('dotenv').config();

// Simple environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Configuration
const config = {
  isProduction,
  frontendUrl: isProduction 
    ? process.env.FRONTEND_URL || 'https://gitforme.tech'
    : process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: isProduction
    ? process.env.BACKEND_URL || 'https://gitforme.onrender.com'
    : process.env.BACKEND_URL || 'http://localhost:3000',
//   cookieDomain: isProduction ? '.gitforme.tech' : undefined,
  sameSite: 'none',
  secure: isProduction,
  redisPrefix: isProduction ? 'prod:' : 'dev:'
};

console.log(`🚀 Starting server in ${isProduction ? 'production' : 'development'} mode`);
console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
console.log(`🔧 Backend URL: ${config.backendUrl}`);

module.exports = config;