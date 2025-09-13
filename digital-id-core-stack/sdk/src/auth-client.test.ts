import { AuthClient } from './auth-client';
import { ClientConfig } from './types';

describe('AuthClient', () => {
  let client: AuthClient;
  let config: ClientConfig;

  beforeEach(() => {
    config = {
      baseUrl: 'http://localhost:3001',
      apiKey: 'test-api-key'
    };
    client = new AuthClient(config);
  });

  describe('constructor', () => {
    it('should create AuthClient with config', () => {
      expect(client).toBeInstanceOf(AuthClient);
    });
  });

  describe('login', () => {
    it('should throw not implemented error', async () => {
      await expect(client.login('test@example.com', 'password123')).rejects.toThrow('Not implemented');
    });
  });

  describe('verify2FA', () => {
    it('should throw not implemented error', async () => {
      await expect(client.verify2FA('test-token', '123456')).rejects.toThrow('Not implemented');
    });
  });
});