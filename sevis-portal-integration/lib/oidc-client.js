/**
 * SEVIS Portal OIDC Client for SevisPass Integration
 * This file implements the OpenID Connect client functionality
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');
const querystring = require('querystring');

class SevisPassOIDCClient {
  constructor(config) {
    this.config = {
      issuer: config.issuer || 'http://localhost:3003',
      clientId: config.clientId || 'sevis-portal-client',
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri || 'http://localhost:3001/auth/callback',
      scope: config.scope || 'openid profile email phone address',
      ...config
    };

    this.endpoints = {
      authorization: `${this.config.issuer}/api/oidc/auth`,
      token: `${this.config.issuer}/api/oidc/token`,
      userinfo: `${this.config.issuer}/api/oidc/me`,
      jwks: `${this.config.issuer}/api/oidc/jwks`,
      discovery: `${this.config.issuer}/.well-known/openid-configuration`
    };
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256'
    };
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Build authorization URL for redirecting users to SevisPass
   */
  buildAuthorizationUrl(options = {}) {
    const state = options.state || this.generateState();
    const pkce = this.generatePKCE();

    const params = {
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope,
      state: state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: pkce.codeChallengeMethod,
      ...options.extraParams
    };

    const url = `${this.endpoints.authorization}?${querystring.stringify(params)}`;
    
    return {
      url,
      state,
      codeVerifier: pkce.codeVerifier
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code, codeVerifier, state) {
    const params = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      code_verifier: codeVerifier
    };

    const postData = querystring.stringify(params);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
      }
    };

    try {
      const response = await this.makeRequest(this.endpoints.token, options, postData);
      return JSON.parse(response);
    } catch (error) {
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }

  /**
   * Get user information using access token
   */
  async getUserInfo(accessToken) {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    };

    try {
      const response = await this.makeRequest(this.endpoints.userinfo, options);
      return JSON.parse(response);
    } catch (error) {
      throw new Error(`UserInfo request failed: ${error.message}`);
    }
  }

  /**
   * Validate ID token (basic validation)
   */
  validateIdToken(idToken) {
    try {
      // Basic JWT structure validation
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT structure');
      }

      // Decode payload (in production, you should verify signature)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      // Basic validation
      if (payload.iss !== this.config.issuer) {
        throw new Error('Invalid issuer');
      }
      
      if (payload.aud !== this.config.clientId) {
        throw new Error('Invalid audience');
      }
      
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }

      return payload;
    } catch (error) {
      throw new Error(`ID token validation failed: ${error.message}`);
    }
  }

  /**
   * Make HTTP request helper
   */
  makeRequest(url, options, postData = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        ...options
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (postData) {
        req.write(postData);
      }

      req.end();
    });
  }

  /**
   * Complete OIDC flow helper
   */
  async completeAuthFlow(code, state, codeVerifier, expectedState) {
    // Validate state parameter
    if (state !== expectedState) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code, codeVerifier, state);
    
    // Validate ID token
    const idTokenPayload = this.validateIdToken(tokens.id_token);
    
    // Get user info
    const userInfo = await this.getUserInfo(tokens.access_token);
    
    return {
      tokens,
      idTokenPayload,
      userInfo
    };
  }
}

module.exports = SevisPassOIDCClient;