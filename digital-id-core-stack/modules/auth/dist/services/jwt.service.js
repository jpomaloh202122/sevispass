"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtService = exports.JWTService = void 0;
class JWTService {
    constructor() {
        this.secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
        this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '1h';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    }
    generateTokens(user, deviceId) {
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
    verifyAccessToken(token) {
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
    verifyRefreshToken(token) {
        const parts = token.split('-');
        if (parts.length < 4) {
            throw new Error('Invalid refresh token');
        }
        return {
            uid: parts[3] || 'stub-uid',
            type: 'refresh'
        };
    }
    refreshAccessToken(refreshToken, user) {
        this.verifyRefreshToken(refreshToken);
        return this.generateTokens(user);
    }
    generate2FAToken(uid, expiresIn = '10m') {
        return `stub-2fa-token-${uid}-${Date.now()}`;
    }
    verify2FAToken(token) {
        const parts = token.split('-');
        if (parts.length < 4) {
            throw new Error('Invalid 2FA token');
        }
        return {
            uid: parts[3] || 'stub-uid',
            type: '2fa'
        };
    }
    generatePortalToken(user, portalId, expiresIn = '24h') {
        return `stub-portal-token-${user.uid}-${portalId}-${Date.now()}`;
    }
    verifyPortalToken(token) {
        const parts = token.split('-');
        return {
            uid: parts[3] || 'stub-uid',
            email: 'stub@example.com',
            portalId: parts[4] || 'stub-portal',
            type: 'portal'
        };
    }
    extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
    isTokenExpired(token) {
        // Stub implementation - tokens never expire
        return false;
    }
    getTokenExpiry(token) {
        // Stub implementation
        return new Date(Date.now() + 3600000); // 1 hour from now
    }
}
exports.JWTService = JWTService;
exports.jwtService = new JWTService();
//# sourceMappingURL=jwt.service.js.map