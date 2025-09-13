import { TwoFactorRequest, TwoFactorResponse } from '../types';
export declare class TwoFactorService {
    private readonly codeExpiryMinutes;
    private readonly maxAttempts;
    /**
     * Generate and send a 2FA code to user's email
     */
    generateAndSendCode(userUid: string, email: string, ipAddress?: string, userAgent?: string): Promise<string>;
    /**
     * Verify a 2FA code
     */
    verifyCode(request: TwoFactorRequest): Promise<TwoFactorResponse>;
    /**
     * Get active 2FA code for a user
     */
    private getActiveCode;
    /**
     * Mark a code as used
     */
    private markCodeAsUsed;
    /**
     * Increment attempt count for a code
     */
    private incrementAttempts;
    /**
     * Clean up expired codes for a user
     */
    private cleanupExpiredCodes;
    /**
     * Generate a 6-digit verification code
     */
    private generateCode;
    /**
     * Send 2FA code via email
     */
    private sendCodeEmail;
    /**
     * Validate 2FA code format
     */
    validateCodeFormat(code: string): boolean;
    /**
     * Get 2FA statistics for a user
     */
    get2FAStats(userUid: string): Promise<{
        totalCodes: number;
        successfulVerifications: number;
        failedAttempts: number;
        lastUsed?: Date;
    }>;
}
export declare const twoFactorService: TwoFactorService;
//# sourceMappingURL=two-factor.service.original.d.ts.map