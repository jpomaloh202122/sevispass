export interface User {
    id: string;
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    nid: string;
    phoneNumber: string;
    address?: string;
    facePhotoPath?: string;
    profileImagePath?: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuthToken {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
}
export interface MobileTokenPayload {
    uid: string;
    email: string;
    deviceId?: string;
    iat?: number;
    exp?: number;
}
export interface AuthenticatedUser {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    nid: string;
    phoneNumber: string;
    address?: string;
    isVerified: boolean;
    createdAt?: string;
}
export interface TwoFactorCode {
    id: string;
    userUid: string;
    code: string;
    expiresAt: Date;
    attempts: number;
    maxAttempts: number;
    isUsed: boolean;
    usedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface LoginRequest {
    email: string;
    password: string;
    deviceId?: string;
}
export interface LoginResponse {
    success: boolean;
    requires2FA?: boolean;
    uid?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: AuthenticatedUser;
    message: string;
}
export interface TwoFactorRequest {
    uid: string;
    code: string;
    deviceId?: string;
}
export interface TwoFactorResponse {
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    user?: AuthenticatedUser;
    message: string;
}
export interface OIDCConfig {
    issuer: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    logoutUri?: string;
    scopes: string[];
}
export interface OIDCClient {
    clientId: string;
    clientSecret: string;
    redirectUris: string[];
    grantTypes: string[];
    responseTypes: string[];
    scopes: string[];
    isActive: boolean;
}
export interface SessionData {
    userId: string;
    email: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    lastAccessed: Date;
    expiresAt: Date;
}
export interface AuthError extends Error {
    code: string;
    statusCode: number;
}
export declare class AuthenticationError extends Error implements AuthError {
    code: string;
    statusCode: number;
    constructor(message: string, code?: string, statusCode?: number);
}
export declare class ValidationError extends Error implements AuthError {
    code: string;
    statusCode: number;
    constructor(message: string, code?: string, statusCode?: number);
}
export declare class TwoFactorError extends Error implements AuthError {
    code: string;
    statusCode: number;
    constructor(message: string, code?: string, statusCode?: number);
}
//# sourceMappingURL=index.d.ts.map