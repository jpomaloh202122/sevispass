import Provider from 'oidc-provider';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { db } from '../database/connection';

// SEVIS Portal Client Configuration
const SEVIS_PORTAL_CLIENT = {
  client_id: 'sevis-portal-client',
  client_secret: process.env.OIDC_CLIENT_SECRET || 'sevis-portal-secret-change-in-production',
  redirect_uris: [
    'http://localhost:3002/auth/callback',
    'https://sevis-portal.gov.pg/auth/callback' // Production URL
  ],
  post_logout_redirect_uris: [
    'http://localhost:3002/auth/logout',
    'https://sevis-portal.gov.pg/auth/logout' // Production URL
  ],
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  scopes: ['openid', 'profile', 'email', 'phone', 'address'],
  token_endpoint_auth_method: 'client_secret_basic'
};

// OIDC Provider Configuration
export const oidcConfig = {
  clients: [SEVIS_PORTAL_CLIENT],
  
  // Issuer configuration
  issuer: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Claims configuration for SevisPass
  claims: {
    openid: ['sub'],
    profile: ['given_name', 'family_name', 'name', 'preferred_username', 'picture', 'updated_at'],
    email: ['email', 'email_verified'],
    phone: ['phone_number', 'phone_number_verified'],
    address: ['address']
  },
  
  // Features configuration
  features: {
    devInteractions: { enabled: false },
    deviceFlow: { enabled: false },
    backchannelLogout: { enabled: false },
    ietfJWTAccessTokenProfile: { enabled: true },
    jwtUserinfo: { enabled: true },
    revocation: { enabled: true },
    introspection: { enabled: true }
  },
  
  // TTL configuration
  ttl: {
    AccessToken: 60 * 60, // 1 hour
    AuthorizationCode: 10 * 60, // 10 minutes
    IdToken: 60 * 60, // 1 hour
    DeviceCode: 10 * 60, // 10 minutes
    RefreshToken: 24 * 60 * 60, // 1 day
  },
  
  // JWT configuration
  jwks: {
    keys: [
      {
        kty: 'RSA',
        kid: 'sevispass-key-1',
        use: 'sig',
        alg: 'RS256',
        n: process.env.JWT_PUBLIC_KEY || 'mock-public-key',
        e: 'AQAB',
        d: process.env.JWT_PRIVATE_KEY || 'mock-private-key'
      }
    ]
  },
  
  // User lookup function
  async findAccount(ctx: any, id: string) {
    logger.info(`Looking up account for ID: ${id}`);
    
    try {
      // Get user from Supabase
      const { data: user, error } = await db
        .from('users')
        .select('*')
        .eq('uid', id)
        .single();
        
      if (error || !user) {
        logger.warn(`User not found for ID: ${id}`);
        return undefined;
      }
      
      return {
        accountId: user.uid,
        claims: async (use: string, scope: string) => {
          logger.info(`Generating claims for user ${user.uid}, use: ${use}, scope: ${scope}`);
          
          const claims: any = {
            sub: user.uid,
            name: `${user.firstName} ${user.lastName}`,
            given_name: user.firstName,
            family_name: user.lastName,
            preferred_username: user.email,
            email: user.email,
            email_verified: user.isVerified,
            phone_number: user.phoneNumber,
            phone_number_verified: true,
            picture: user.profileImagePath,
            updated_at: Math.floor(new Date(user.updatedAt).getTime() / 1000)
          };
          
          // Add address if available
          if (user.address) {
            claims.address = {
              formatted: user.address,
              country: 'Papua New Guinea'
            };
          }
          
          // Add custom SevisPass claims
          claims.nid = user.nid;
          claims.is_verified = user.isVerified;
          claims.created_at = Math.floor(new Date(user.createdAt).getTime() / 1000);
          
          return claims;
        }
      };
    } catch (error) {
      logger.error('Error finding account:', error);
      return undefined;
    }
  },
  
  // Interaction handling
  interactions: {
    url(ctx: any, interaction: any) {
      return `/auth/interaction/${interaction.uid}`;
    }
  },
  
  // Custom token format
  formats: {
    AccessToken: 'jwt',
    ClientCredentials: 'jwt'
  }
};

export class OIDCProviderService {
  private provider: Provider;
  private isInitialized = false;

  constructor() {
    logger.info('Initializing OIDC Provider for SevisPass');
  }

  async initialize(): Promise<Provider> {
    if (this.isInitialized) {
      return this.provider;
    }

    try {
      this.provider = new Provider(oidcConfig.issuer, oidcConfig);
      
      // Add custom routes for SevisPass integration
      this.addCustomRoutes();
      
      this.isInitialized = true;
      logger.info(`OIDC Provider initialized at ${oidcConfig.issuer}`);
      logger.info('Registered clients:', oidcConfig.clients.map(c => c.client_id));
      
      return this.provider;
    } catch (error) {
      logger.error('Failed to initialize OIDC Provider:', error);
      throw error;
    }
  }

  private addCustomRoutes() {
    // Custom SevisPass login endpoint
    this.provider.use('/auth/sevispass-login', async (ctx, next) => {
      if (ctx.method === 'POST') {
        const { email, password } = ctx.request.body;
        
        logger.info(`SevisPass login attempt for email: ${email}`);
        
        try {
          // Validate user credentials (implement your login logic here)
          const user = await this.validateUserCredentials(email, password);
          
          if (user) {
            // Create session for OIDC flow
            ctx.oidc.session = {
              accountId: user.uid,
              loginTs: Math.floor(Date.now() / 1000)
            };
            
            logger.info(`User ${user.uid} authenticated successfully`);
            ctx.status = 200;
            ctx.body = { success: true, user_id: user.uid };
          } else {
            ctx.status = 401;
            ctx.body = { error: 'invalid_credentials' };
          }
        } catch (error) {
          logger.error('Login error:', error);
          ctx.status = 500;
          ctx.body = { error: 'server_error' };
        }
      } else {
        await next();
      }
    });
  }

  private async validateUserCredentials(email: string, password: string): Promise<any> {
    // This would integrate with your existing auth system
    // For now, return a mock user
    logger.info('Validating credentials (mock implementation)');
    
    const { data: user } = await db
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    return user; // In production, verify password hash here
  }

  getProvider(): Provider {
    if (!this.isInitialized) {
      throw new Error('OIDC Provider not initialized. Call initialize() first.');
    }
    return this.provider;
  }

  // Get OIDC metadata for clients
  getMetadata() {
    return {
      issuer: oidcConfig.issuer,
      authorization_endpoint: `${oidcConfig.issuer}/auth`,
      token_endpoint: `${oidcConfig.issuer}/token`,
      userinfo_endpoint: `${oidcConfig.issuer}/me`,
      jwks_uri: `${oidcConfig.issuer}/jwks`,
      end_session_endpoint: `${oidcConfig.issuer}/session/end`,
      supported_scopes: ['openid', 'profile', 'email', 'phone', 'address'],
      supported_response_types: ['code'],
      supported_grant_types: ['authorization_code', 'refresh_token'],
      supported_claims: Object.values(oidcConfig.claims).flat()
    };
  }
}

export const oidcProviderService = new OIDCProviderService();