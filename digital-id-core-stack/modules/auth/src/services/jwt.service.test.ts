import { JWTService } from './jwt.service';
import { AuthenticatedUser } from '../types';

describe('JWTService', () => {
  let jwtService: JWTService;
  let mockUser: AuthenticatedUser;

  beforeEach(() => {
    jwtService = new JWTService();
    mockUser = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      nid: '123456789',
      phoneNumber: '+1234567890',
      isVerified: true
    };
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const tokens = jwtService.generateTokens(mockUser);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresIn).toBe(3600);
      expect(tokens.accessToken).toContain('stub-access-token');
      expect(tokens.refreshToken).toContain('stub-refresh-token');
    });

    it('should include device ID in token when provided', () => {
      const deviceId = 'device-123';
      const tokens = jwtService.generateTokens(mockUser, deviceId);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.accessToken).toContain(mockUser.uid);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode valid access token', () => {
      const tokens = jwtService.generateTokens(mockUser);
      const decoded = jwtService.verifyAccessToken(tokens.accessToken);
      
      expect(decoded.uid).toBeDefined();
      expect(decoded.email).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        jwtService.verifyAccessToken('invalid-token');
      }).toThrow('Invalid token');
    });
  });

  describe('generate2FAToken', () => {
    it('should generate 2FA token', () => {
      const token = jwtService.generate2FAToken(mockUser.uid);
      
      expect(token).toBeDefined();
      expect(token).toContain('stub-2fa-token');
      expect(token).toContain(mockUser.uid);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;
      
      const extracted = jwtService.extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header', () => {
      expect(jwtService.extractTokenFromHeader('Invalid header')).toBeNull();
      expect(jwtService.extractTokenFromHeader('')).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for stub tokens (never expire)', () => {
      const tokens = jwtService.generateTokens(mockUser);
      expect(jwtService.isTokenExpired(tokens.accessToken)).toBe(false);
    });
  });
});