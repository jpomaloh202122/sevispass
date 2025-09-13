import { TwoFactorRequest, TwoFactorResponse } from '../types';
export declare class TwoFactorService {
    private readonly codeExpiryMinutes;
    private readonly maxAttempts;
    generateCode(uid: string, email: string): Promise<void>;
    verifyCode(request: TwoFactorRequest): Promise<TwoFactorResponse>;
    private generateRandomCode;
    getUserStats(userUid: string): Promise<{
        totalCodes: number;
        successfulVerifications: number;
        failedAttempts: number;
        lastUsed: Date | null;
    }>;
}
export declare const twoFactorService: TwoFactorService;
//# sourceMappingURL=two-factor.service.d.ts.map