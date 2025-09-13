import { db } from './db';

// Lazy import to avoid initialization issues
let Provider: any = null;

async function loadProvider() {
  if (!Provider) {
    const oidcProvider = await import('oidc-provider');
    Provider = oidcProvider.default;
  }
  return Provider;
}

// OIDC Provider Configuration function
function getOIDCConfiguration() {
  const issuer = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
  
  return {
    // Core issuer configuration
    issuer,
    
    // Supported features
    features: {
      devInteractions: { enabled: false },
      deviceFlow: { enabled: false },
      revocation: { enabled: true },
      introspection: { enabled: true },
      userinfo: { enabled: true },
    },
    
    // Supported grant types
    grantTypes: [
      'authorization_code',
      'refresh_token',
    ],
    
    // Supported response types
    responseTypes: [
      'code',
    ],
    
    // JWT configuration - simplified for development
    jwks: {
      keys: [{
        kty: 'RSA',
        kid: 'sevispass-dev-key',
        use: 'sig',
        alg: 'RS256',
        n: 'xwQ72P9z9OYshiQ-ntDYaPnnfwG6u9JAdLMZ5o0dmjlcyrvwQRdoFIKPnO65Q8mh6F_LDSxjxa2Yzo_wdjhbPZLjfUJXgCzm54cClXzT5twzo7lzoAfaJlkTsoZc2HFWqmcri0BuzmTFLZx2Q4kYFadYPZSCGxIwT2pJh2mJnM7zPfO2HGjdHJ1oD1n-MtSDTXbTMZNnMZIBmH-Jpy_2VCYf4GkA6Dc-Sp_OhXvSBfnU3YzN3kCJg8MIeF2q2ZwGTGk9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJQ',
        e: 'AQAB',
        d: 'X4cTteJY_gn4FYPsXB8rdXix5vwsg1FLN5E3EaG6RJoVH-HLLKD9M7dx5oo7GURknchnrRweUkC7hT5fJLM0WbFAKNLWYdK5IMaGVYdNO4nHo4mIW3kzj3-hREFDsLHKUqvdJC6O5Sz8UMJRH5oJzJb4tz_YTw1g-7mJj9w7AyQOLBb4UgDPxgf1B0nDDfKSA_YNgpT3_Vx0tgDgVs7lW9TJ7kK7H6H9r7W2kJQ3iGq6zKz-2Q8j8fh8W8F4Q7kF7a7vJ8F-F7dF5dF7dF8F8F9F0F1F2F3F4F5F6F7F8F9F0F1F2F3F4F5F6F7F8F9F0F1F2F3F4F5F6F7F8F9F0Q',
        p: '6NbkXwDWUhi-eR55Cgbf27FkQDDyxB-6qbhFgxFKaX9F5gq4Y5fQ6Q2Q3J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q',
        q: '2S5GuSiN_yJGmFhBPQYZqfI3Iz-MtS6t_7K8KJdD4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q',
        dp: 'Hwi9Oqk_4cBTFk_4fk4Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q',
        dq: 'X4cTteJY_gn4FYPsXB8rdXix5vwsg1FLN5E3EaG6RJoVH-HLLKD9M7dx5oo7GURknchnrRweUkC7hT5fJLM0WbFAKNLWYdK5IMaGVYdNO4nHo4mIW3kzj3-hREFDsLHKUqvdJC6O5Sz8UMJRH5oJzJb4tz_YTw1g-7mJj9w7AyQ',
        qi: '1iJtR5i1DFzSF7Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q'
      }]
    },
  
  // Token configuration
  ttl: {
    AccessToken: 60 * 60, // 1 hour
    AuthorizationCode: 10 * 60, // 10 minutes
    IdToken: 60 * 60, // 1 hour
    DeviceCode: 10 * 60, // 10 minutes
    RefreshToken: 14 * 24 * 60 * 60, // 14 days
  },

  // Claims configuration
  claims: {
    address: ['address'],
    email: ['email', 'email_verified'],
    phone: ['phone_number', 'phone_number_verified'],
    profile: ['birthdate', 'family_name', 'gender', 'given_name', 'locale', 'middle_name', 'name', 'nickname', 'picture', 'preferred_username', 'profile', 'updated_at', 'website', 'zoneinfo'],
  },

  // Scopes configuration
  scopes: ['openid', 'profile', 'email', 'phone', 'address'],

  // Subject types
  subjectTypes: ['public'],

  // Client configuration
  clients: [
    {
      client_id: 'sevis-portal-client',
      client_secret: process.env.OIDC_CLIENT_SECRET || 'sevis-portal-secret-change-in-production',
      redirect_uris: [
        process.env.SEVIS_PORTAL_REDIRECT_URI || 'http://localhost:3001/auth/callback',
      ],
      post_logout_redirect_uris: [
        process.env.SEVIS_PORTAL_LOGOUT_URI || 'http://localhost:3001/auth/logout',
      ],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'openid profile email phone address',
      token_endpoint_auth_method: 'client_secret_basic',
    },
  ],

  // Interaction policy configuration
  interactions: {
    url(ctx: any, interaction: any) {
      return `/auth/interaction/${interaction.uid}`;
    },
  },

  // Custom cookies configuration
  cookies: {
    keys: [process.env.JWT_SECRET || 'your-super-secret-jwt-key-here-change-in-production'],
  },

  // Find account implementation
  async findAccount(ctx: any, id: string) {
    try {
      const user = await db.user.findUnique({
        where: { uid: id }
      });

      if (!user) return undefined;

      return {
        accountId: user.uid,
        claims: async (use: string, scope: string) => {
          const claims: any = { sub: user.uid };

          if (scope.includes('profile')) {
            claims.name = `${user.firstName} ${user.lastName}`;
            claims.given_name = user.firstName;
            claims.family_name = user.lastName;
            claims.preferred_username = user.email;
            claims.updated_at = Math.floor(new Date(user.updatedAt).getTime() / 1000);
          }

          if (scope.includes('email')) {
            claims.email = user.email;
            claims.email_verified = true;
          }

          if (scope.includes('phone')) {
            claims.phone_number = user.phoneNumber;
            claims.phone_number_verified = true;
          }

          if (scope.includes('address')) {
            claims.address = {
              formatted: user.address || '',
              street_address: user.address || '',
              locality: '',
              region: '',
              postal_code: '',
              country: 'PNG'
            };
          }

          return claims;
        },
      };
    } catch (error) {
      console.error('Error finding account:', error);
      return undefined;
    }
  },

  // Render error page
  renderError: async (ctx: any, out: any, error: any) => {
    ctx.type = 'html';
    ctx.body = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SevisPass OIDC - Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
            .error { color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>SevisPass OIDC Provider</h1>
          <div class="error">
            <h2>Error</h2>
            <p>${error.error_description || error.message}</p>
            <p><small>Error Code: ${error.error}</small></p>
          </div>
          <p><a href="/">Return to SevisPass</a></p>
        </body>
      </html>
    `;
    },
  };
}

// Create and configure the OIDC Provider instance
let oidcProvider: any = null;

export async function getOidcProvider() {
  if (!oidcProvider) {
    const ProviderClass = await loadProvider();
    const config = getOIDCConfiguration();
    oidcProvider = new ProviderClass(config.issuer, config);
  }
  return oidcProvider;
}

export { getOIDCConfiguration };