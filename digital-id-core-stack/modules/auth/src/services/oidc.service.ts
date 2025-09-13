import { OIDCConfig, OIDCClient } from '../types';
import { logger } from '../utils/logger';

export class OIDCService {
  private config: OIDCConfig;

  constructor(config: OIDCConfig) {
    this.config = config;
    logger.info('OIDC Service initialized (stub)');
  }

  async initialize(): Promise<void> {
    logger.info('OIDC Provider initialized (stub)');
  }

  async createClient(clientData: Partial<OIDCClient>): Promise<OIDCClient> {
    const client: OIDCClient = {
      clientId: clientData.clientId || 'stub-client-id',
      clientSecret: clientData.clientSecret || 'stub-client-secret',
      redirectUris: clientData.redirectUris || ['http://localhost:3000/callback'],
      grantTypes: clientData.grantTypes || ['authorization_code'],
      responseTypes: clientData.responseTypes || ['code'],
      scopes: clientData.scopes || ['openid', 'profile', 'email'],
      isActive: true
    };
    
    logger.info(`Created OIDC client: ${client.clientId} (stub)`);
    return client;
  }

  async getAuthorizationUrl(clientId: string, redirectUri: string, state?: string): Promise<string> {
    return `${this.config.issuer}/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+profile+email&state=${state || 'stub-state'}`;
  }

  async exchangeCodeForTokens(code: string, clientId: string): Promise<any> {
    return {
      access_token: 'stub-access-token',
      id_token: 'stub-id-token',
      token_type: 'Bearer',
      expires_in: 3600
    };
  }
}

export const createOIDCService = (config: OIDCConfig) => new OIDCService(config);
