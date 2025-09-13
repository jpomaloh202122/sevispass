import { MobileTokenPayload, AuthToken, AuthenticatedUser } from '../types';
export declare class JWTService {
    private readonly secret;
    private readonly accessTokenExpiry;
    private readonly refreshTokenExpiry;
    constructor();
    generateTokens(user: AuthenticatedUser, deviceId?: string): AuthToken;
    verifyAccessToken(token: string): MobileTokenPayload;
    verifyRefreshToken(token: string): {
        uid: string;
        type: string;
    };
    refreshAccessToken(refreshToken: string, user: AuthenticatedUser): AuthToken;
    generate2FAToken(uid: string, expiresIn?: string): string;
    verify2FAToken(token: string): {
        uid: string;
        type: string;
    };
    generatePortalToken(user: AuthenticatedUser, portalId: string, expiresIn?: string): string;
    verifyPortalToken(token: string): {
        uid: string;
        email: string;
        portalId: string;
        type: string;
    };
    extractTokenFromHeader(authHeader: string): string | null;
    isTokenExpired(token: string): boolean;
    getTokenExpiry(token: string): Date | null;
}
export declare const jwtService: JWTService;
//# sourceMappingURL=jwt.service.d.ts.map