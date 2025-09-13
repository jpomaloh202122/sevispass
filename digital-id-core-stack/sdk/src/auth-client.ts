import { ClientConfig, ApiResponse } from './types';

export class AuthClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  async login(username: string, password: string): Promise<ApiResponse<{ token: string }>> {
    // Placeholder implementation
    throw new Error('Not implemented');
  }

  async verify2FA(token: string, code: string): Promise<ApiResponse<boolean>> {
    // Placeholder implementation
    throw new Error('Not implemented');
  }
}