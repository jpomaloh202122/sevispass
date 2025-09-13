/**
 * SEVIS Portal Express Application
 * Complete implementation with OIDC authentication and PSP system
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import our modules
const createAuthRoutes = require('./routes/auth');
const createPSPRoutes = require('./routes/psp');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// OIDC Configuration
const oidcConfig = {
  issuer: process.env.OIDC_ISSUER || 'http://localhost:3000',
  clientId: process.env.OIDC_CLIENT_ID || 'sevis-portal-client',
  clientSecret: process.env.OIDC_CLIENT_SECRET || 'sevis-portal-secret-change-in-production',
  redirectUri: process.env.OIDC_REDIRECT_URI || `http://localhost:${PORT}/auth/callback`,
  scope: process.env.OIDC_SCOPE || 'openid profile email phone address'
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3002',
  credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize authentication
const { router: authRouter, authMiddleware } = createAuthRoutes(oidcConfig);

// Routes
app.use('/auth', authRouter);
app.use('/psp', createPSPRoutes(authMiddleware));

// Main dashboard route
app.get('/dashboard', authMiddleware.requireAuth, (req, res) => {
  res.json({
    message: 'Welcome to SEVIS Portal',
    user: req.user,
    availableServices: [
      {
        name: 'Public Servant Pass',
        description: 'Apply for your digital government employee credential',
        url: '/psp/dashboard'
      }
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      sevispass_oidc: oidcConfig.issuer,
      database: 'connected' // Update based on your database status
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SEVIS Portal',
    version: '1.0.0',
    description: 'Papua New Guinea Government Services Portal',
    authentication: 'SevisPass OIDC',
    endpoints: {
      login: '/auth/login',
      dashboard: '/dashboard',
      psp: '/psp/dashboard',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SEVIS Portal running on http://localhost:${PORT}`);
  console.log(`📋 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔐 Login: http://localhost:${PORT}/auth/login`);
  console.log(`🏛️  PSP Portal: http://localhost:${PORT}/psp/dashboard`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`\n🔗 SevisPass OIDC Provider: ${oidcConfig.issuer}`);
  console.log(`📧 Support: Integrated with ${oidcConfig.issuer}`);
});

module.exports = app;