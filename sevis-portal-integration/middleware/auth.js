/**
 * SEVIS Portal Authentication Middleware
 * Handles OIDC authentication with SevisPass
 */

const SevisPassOIDCClient = require('../lib/oidc-client');

class AuthMiddleware {
  constructor(config) {
    this.oidcClient = new SevisPassOIDCClient(config);
    this.sessions = new Map(); // In production, use Redis or database
  }

  /**
   * Middleware to check if user is authenticated
   */
  requireAuth = (req, res, next) => {
    const sessionId = req.session?.id || req.cookies?.sessionId;
    
    if (!sessionId || !this.sessions.has(sessionId)) {
      return res.status(401).json({
        error: 'Authentication required',
        loginUrl: '/auth/login'
      });
    }

    const sessionData = this.sessions.get(sessionId);
    if (sessionData.expires < Date.now()) {
      this.sessions.delete(sessionId);
      return res.status(401).json({
        error: 'Session expired',
        loginUrl: '/auth/login'
      });
    }

    req.user = sessionData.user;
    req.sessionData = sessionData;
    next();
  };

  /**
   * Check if user has specific permissions
   */
  requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check user permissions (implement based on your user model)
      if (req.user.permissions && req.user.permissions.includes(permission)) {
        next();
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
      }
    };
  };

  /**
   * Get current user info
   */
  getCurrentUser = (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      user: req.user,
      sessionInfo: {
        expires: req.sessionData.expires,
        loginTime: req.sessionData.loginTime
      }
    });
  };

  /**
   * Initiate OIDC login
   */
  initiateLogin = (req, res) => {
    try {
      const authData = this.oidcClient.buildAuthorizationUrl({
        extraParams: req.query // Allow passing additional parameters
      });

      // Store PKCE data in session for later verification
      const tempSessionId = this.generateSessionId();
      this.sessions.set(tempSessionId, {
        state: authData.state,
        codeVerifier: authData.codeVerifier,
        expires: Date.now() + (10 * 60 * 1000), // 10 minutes
        type: 'temp_auth'
      });

      // Set temporary session cookie
      res.cookie('tempSessionId', tempSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000 // 10 minutes
      });

      // Redirect to SevisPass
      res.redirect(authData.url);
    } catch (error) {
      console.error('Login initiation failed:', error);
      res.status(500).json({ error: 'Login initiation failed' });
    }
  };

  /**
   * Handle OIDC callback
   */
  handleCallback = async (req, res) => {
    try {
      const { code, state, error } = req.query;
      const tempSessionId = req.cookies?.tempSessionId;

      // Check for OAuth error
      if (error) {
        return res.status(400).json({
          error: 'Authentication failed',
          details: req.query.error_description
        });
      }

      // Validate temp session
      if (!tempSessionId || !this.sessions.has(tempSessionId)) {
        return res.status(400).json({ error: 'Invalid session' });
      }

      const tempSession = this.sessions.get(tempSessionId);
      
      // Complete OIDC flow
      const authResult = await this.oidcClient.completeAuthFlow(
        code,
        state,
        tempSession.codeVerifier,
        tempSession.state
      );

      // Create authenticated session
      const sessionId = this.generateSessionId();
      const sessionData = {
        user: {
          sub: authResult.userInfo.sub,
          name: authResult.userInfo.name,
          email: authResult.userInfo.email,
          phone: authResult.userInfo.phone_number,
          address: authResult.userInfo.address,
          verified: {
            email: authResult.userInfo.email_verified,
            phone: authResult.userInfo.phone_number_verified
          }
        },
        tokens: authResult.tokens,
        loginTime: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        type: 'authenticated'
      };

      this.sessions.set(sessionId, sessionData);
      this.sessions.delete(tempSessionId); // Clean up temp session

      // Set session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Clear temp cookie
      res.clearCookie('tempSessionId');

      // Redirect to dashboard or intended page
      const returnTo = req.session?.returnTo || '/dashboard';
      res.redirect(returnTo);

    } catch (error) {
      console.error('Callback handling failed:', error);
      res.status(500).json({
        error: 'Authentication callback failed',
        details: error.message
      });
    }
  };

  /**
   * Logout user
   */
  logout = (req, res) => {
    const sessionId = req.session?.id || req.cookies?.sessionId;
    
    if (sessionId) {
      this.sessions.delete(sessionId);
    }

    res.clearCookie('sessionId');
    res.json({ message: 'Logged out successfully' });
  };

  /**
   * Generate session ID
   */
  generateSessionId() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Clean up expired sessions (run periodically)
   */
  cleanupSessions() {
    const now = Date.now();
    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (sessionData.expires < now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

module.exports = AuthMiddleware;