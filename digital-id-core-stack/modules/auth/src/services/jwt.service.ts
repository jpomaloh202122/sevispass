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

  generateTokens(user: AuthenticatedUser, deviceId?: string): AuthToken {
    // Stub implementation - use proper JWT library in production
    const accessToken = `stub-access-token-${user.uid}-${Date.now()}`;
    const refreshToken = `stub-refresh-token-${user.uid}-${Date.now()}`;

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour
      tokenType: 'Bearer'
    };
  }

  verifyAccessToken(token: string): MobileTokenPayload {
    // Stub implementation
    const parts = token.split('-');
    if (parts.length < 4) {
      throw new Error('Invalid token');
    }
    
    return {
      uid: parts[3] || 'stub-uid',
      email: 'stub@example.com',
      iat: Math.floor(Date.now() / 1000)
    };
  }

  verifyRefreshToken(token: string): { uid: string; type: string } {
    const parts = token.split('-');
    if (parts.length < 4) {
      throw new Error('Invalid refresh token');
    }
    
    return {
      uid: parts[3] || 'stub-uid',
      type: 'refresh'
    };
  }

  refreshAccessToken(refreshToken: string, user: AuthenticatedUser): AuthToken {
    this.verifyRefreshToken(refreshToken);
    return this.generateTokens(user);
  }

  generate2FAToken(uid: string, expiresIn: string = '10m'): string {
    return `stub-2fa-token-${uid}-${Date.now()}`;
  }

  verify2FAToken(token: string): { uid: string; type: string } {
    const parts = token.split('-');
    if (parts.length < 4) {
      throw new Error('Invalid 2FA token');
    }
    
    return {
      uid: parts[3] || 'stub-uid',
      type: '2fa'
    };
  }

  generatePortalToken(user: AuthenticatedUser, portalId: string, expiresIn: string = '24h'): string {
    return `stub-portal-token-${user.uid}-${portalId}-${Date.now()}`;
  }

  verifyPortalToken(token: string): { uid: string; email: string; portalId: string; type: string } {
    const parts = token.split('-');
    return {
      uid: parts[3] || 'stub-uid',
      email: 'stub@example.com',
      portalId: parts[4] || 'stub-portal',
      type: 'portal'
    };
  }

  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  isTokenExpired(token: string): boolean {
    // Stub implementation - tokens never expire
    return false;
  }

  getTokenExpiry(token: string): Date | null {
    // Stub implementation
    return new Date(Date.now() + 3600000); // 1 hour from now
  }
}

export const jwtService = new JWTService();
