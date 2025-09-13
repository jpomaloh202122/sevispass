import { TwoFactorService } from './two-factor.service';
import { TwoFactorRequest } from '../types';

// Mock the email service
jest.mock('../utils/email', () => ({
  emailService: {
    send2FACode: jest.fn().mockResolvedValue(true)
  }
}));

describe('TwoFactorService', () => {
  let twoFactorService: TwoFactorService;

  beforeEach(() => {
    twoFactorService = new TwoFactorService();
  });

  describe('generateCode', () => {
    it('should generate and send 2FA code', async () => {
      const uid = 'test-uid-123';
      const email = 'test@example.com';

      await expect(twoFactorService.generateCode(uid, email)).resolves.not.toThrow();
    });
  });

  describe('verifyCode', () => {
    it('should verify 2FA code successfully (stub)', async () => {
      const request: TwoFactorRequest = {
        uid: 'test-uid-123',
        code: '123456'
      };

      const response = await twoFactorService.verifyCode(request);

      expect(response.success).toBe(true);
      expect(response.message).toContain('stub');
      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const stats = await twoFactorService.getUserStats('test-uid-123');

      expect(stats).toHaveProperty('totalCodes');
      expect(stats).toHaveProperty('successfulVerifications');
      expect(stats).toHaveProperty('failedAttempts');
      expect(stats).toHaveProperty('lastUsed');
      expect(typeof stats.totalCodes).toBe('number');
    });
  });
});