import { ClientConfig, ApiResponse } from './types';

export class VerificationClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  async verifyFace(imageData: Buffer): Promise<ApiResponse<boolean>> {
    // Placeholder implementation
    throw new Error('Not implemented');
  }

  async verifyDocument(imageData: Buffer): Promise<ApiResponse<any>> {
    // Placeholder implementation
    throw new Error('Not implemented');
  }
}