/**
 * SEVIS Portal Authentication Routes
 * Express.js routes for OIDC authentication
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');

function createAuthRoutes(config) {
  const router = express.Router();
  const authMiddleware = new AuthMiddleware(config);

  // Start session cleanup task
  setInterval(() => {
    authMiddleware.cleanupSessions();
  }, 5 * 60 * 1000); // Every 5 minutes

  /**
   * GET /auth/login
   * Initiate OIDC login flow
   */
  router.get('/login', authMiddleware.initiateLogin);

  /**
   * GET /auth/callback
   * Handle OIDC callback from SevisPass
   */
  router.get('/callback', authMiddleware.handleCallback);

  /**
   * POST /auth/logout
   * Logout current user
   */
  router.post('/logout', authMiddleware.logout);

  /**
   * GET /auth/user
   * Get current user information
   */
  router.get('/user', authMiddleware.requireAuth, authMiddleware.getCurrentUser);

  /**
   * GET /auth/status
   * Check authentication status
   */
  router.get('/status', (req, res) => {
    const sessionId = req.session?.id || req.cookies?.sessionId;
    const isAuthenticated = sessionId && authMiddleware.sessions.has(sessionId);
    
    res.json({
      authenticated: isAuthenticated,
      loginUrl: '/auth/login',
      logoutUrl: '/auth/logout'
    });
  });

  return { router, authMiddleware };
}

module.exports = createAuthRoutes;