import jwt, { SignOptions } from 'jsonwebtoken';
import { MobileTokenPayload, AuthToken, AuthenticatedUser } from '../types';

export class JWTService {
  private readonly secret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '1h';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Generate access and refresh tokens for a user
   */
  generateTokens(user: AuthenticatedUser, deviceId?: string): AuthToken {
    const payload: MobileTokenPayload = {
      uid: user.uid,
      email: user.email,
      deviceId,
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(payload, this.secret, {
      expiresIn: this.accessTokenExpiry
    });

    const refreshToken = jwt.sign(
      { uid: user.uid, type: 'refresh' },
      this.secret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpiryInSeconds(this.accessTokenExpiry),
      tokenType: 'Bearer'
    };
  }

  /**
   * Verify and decode an access token
   */
  verifyAccessToken(token: string): MobileTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as MobileTokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Verify and decode a refresh token
   */
  verifyRefreshToken(token: string): { uid: string; type: string } {
    try {
      const decoded = jwt.verify(token, this.secret) as any;
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token type');
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw new Error('Refresh token verification failed');
    }
  }

  /**
   * Generate a new access token using a refresh token
   */
  refreshAccessToken(refreshToken: string, user: AuthenticatedUser): AuthToken {
    const decoded = this.verifyRefreshToken(refreshToken);
    
    if (decoded.uid !== user.uid) {
      throw new Error('Refresh token does not match user');
    }

    return this.generateTokens(user);
  }

  /**
   * Generate a temporary token for 2FA verification
   */
  generate2FAToken(uid: string, expiresIn: string = '10m'): string {
    return jwt.sign(
      { uid, type: '2fa', iat: Math.floor(Date.now() / 1000) },
      this.secret,
      { expiresIn }
    );
  }

  /**
   * Verify a 2FA token
   */
  verify2FAToken(token: string): { uid: string; type: string } {
    try {
      const decoded = jwt.verify(token, this.secret) as any;
      if (decoded.type !== '2fa') {
        throw new Error('Invalid 2FA token type');
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('2FA token has expired');
      }
      throw new Error('Invalid 2FA token');
    }
  }

  /**
   * Generate a portal authentication token
   */
  generatePortalToken(user: AuthenticatedUser, portalId: string, expiresIn: string = '24h'): string {
    return jwt.sign(
      {
        uid: user.uid,
        email: user.email,
        portalId,
        type: 'portal',
        iat: Math.floor(Date.now() / 1000)
      },
      this.secret,
      { expiresIn }
    );
  }

  /**
   * Verify a portal authentication token
   */
  verifyPortalToken(token: string): { uid: string; email: string; portalId: string; type: string } {
    try {
      const decoded = jwt.verify(token, this.secret) as any;
      if (decoded.type !== 'portal') {
        throw new Error('Invalid portal token type');
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Portal token has expired');
      }
      throw new Error('Invalid portal token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Get expiry time in seconds from a time string
   */
  private getExpiryInSeconds(timeString: string): number {
    const timeUnits: { [key: string]: number } = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400
    };

    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default to 1 hour
    }

    const value = parseInt(match[1]);
    const unit = match[2];
    return value * timeUnits[unit];
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiry date
   */
  getTokenExpiry(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return null;
      }
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}

export const jwtService = new JWTService();
