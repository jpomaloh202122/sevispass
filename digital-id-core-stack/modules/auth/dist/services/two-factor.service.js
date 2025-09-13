"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twoFactorService = exports.TwoFactorService = void 0;
const email_1 = require("../utils/email");
const logger_1 = require("../utils/logger");
// Temporary stub implementation - replace with actual database implementation
class TwoFactorService {
    constructor() {
        this.codeExpiryMinutes = 10;
        this.maxAttempts = 5;
    }
    async generateCode(uid, email) {
        const code = this.generateRandomCode();
        logger_1.logger.info(`Generated 2FA code for user ${uid}`);
        await email_1.emailService.send2FACode(email, code);
    }
    async verifyCode(request) {
        // Stub implementation
        return {
            success: true,
            message: 'Code verified successfully (stub)',
            accessToken: 'stub-token',
            refreshToken: 'stub-refresh-token'
        };
    }
    generateRandomCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async getUserStats(userUid) {
        return {
            totalCodes: 0,
            successfulVerifications: 0,
            failedAttempts: 0,
            lastUsed: null
        };
    }
}
exports.TwoFactorService = TwoFactorService;
exports.twoFactorService = new TwoFactorService();
//# sourceMappingURL=two-factor.service.js.map