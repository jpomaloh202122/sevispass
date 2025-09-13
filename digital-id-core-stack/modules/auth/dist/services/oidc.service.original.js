"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOIDCService = exports.OIDCService = void 0;
const oidc_provider_1 = __importDefault(require("oidc-provider"));
const logger_1 = require("../utils/logger");
class OIDCService {
    constructor(config) {
        this.config = config;
        this.provider = this.createProvider();
    }
    /**
     * Create and configure OIDC provider
     */
    createProvider() {
        const configuration = {
            clients: [
                {
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    redirect_uris: [this.config.redirectUri],
                    post_logout_redirect_uris: [this.config.logoutUri || this.config.redirectUri],
                    grant_types: ['authorization_code', 'refresh_token'],
                    response_types: ['code'],
                    scopes: this.config.scopes,
                    token_endpoint_auth_method: 'client_secret_basic'
                }
            ],
            features: {
                devInteractions: { enabled: false },
                introspection: { enabled: true },
                revocation: { enabled: true },
                sessionManagement: { enabled: true },
                backchannelLogout: { enabled: true },
                claimsParameter: { enabled: true },
                clientCredentials: { enabled: true },
                deviceFlow: { enabled: true },
                resourceIndicators: { enabled: true }
            },
            formats: {
                AccessToken: 'jwt',
                ClientCredentials: 'jwt'
            },
            jwks: {
                keys: this.generateJWKS()
            },
            interactions: {
                url: (ctx, interaction) => {
                    return `/interaction/${interaction.uid}`;
                }
            },
            cookies: {
                keys: [process.env.COOKIE_SECRET || 'default-cookie-secret']
            },
            ttl: {
                AccessToken: 1 * 60 * 60, // 1 hour
                AuthorizationCode: 10 * 60, // 10 minutes
                IdToken: 1 * 60 * 60, // 1 hour
                RefreshToken: 1 * 24 * 60 * 60, // 1 day
                DeviceCode: 10 * 60, // 10 minutes
                BackchannelAuthenticationRequest: 10 * 60 // 10 minutes
            },
            claims: {
                openid: ['sub'],
                profile: ['name', 'family_name', 'given_name', 'middle_name', 'nickname', 'preferred_username', 'profile', 'picture', 'website', 'gender', 'birthdate', 'zoneinfo', 'locale', 'updated_at'],
                email: ['email', 'email_verified'],
                address: ['address'],
                phone: ['phone_number', 'phone_number_verified']
            }
        };
        return new oidc_provider_1.default(this.config.issuer, configuration);
    }
    /**
     * Get the OIDC provider instance
     */
    getProvider() {
        return this.provider;
    }
    /**
     * Get discovery document
     */
    getDiscoveryDocument() {
        return {
            issuer: this.config.issuer,
            authorization_endpoint: `${this.config.issuer}/auth`,
            token_endpoint: `${this.config.issuer}/token`,
            userinfo_endpoint: `${this.config.issuer}/me`,
            jwks_uri: `${this.config.issuer}/jwks`,
            scopes_supported: this.config.scopes,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code', 'refresh_token'],
            subject_types_supported: ['public'],
            id_token_signing_alg_values_supported: ['RS256'],
            token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
            claims_supported: [
                'sub', 'iss', 'aud', 'exp', 'iat', 'auth_time', 'nonce', 'acr', 'amr',
                'name', 'family_name', 'given_name', 'email', 'email_verified',
                'phone_number', 'phone_number_verified', 'address'
            ]
        };
    }
    /**
     * Register a new OIDC client
     */
    async registerClient(client) {
        try {
            // In a real implementation, you would store this in a database
            // For now, we'll add it to the provider's configuration
            const newClient = {
                client_id: client.clientId,
                client_secret: client.clientSecret,
                redirect_uris: client.redirectUris,
                grant_types: client.grantTypes,
                response_types: client.responseTypes,
                scopes: client.scopes,
                token_endpoint_auth_method: 'client_secret_basic'
            };
            // This would typically be stored in a database and loaded on startup
            logger_1.logger.info(`OIDC client registered: ${client.clientId}`);
        }
        catch (error) {
            logger_1.logger.error('Error registering OIDC client:', error);
            throw new Error('Failed to register OIDC client');
        }
    }
    /**
     * Validate client credentials
     */
    async validateClient(clientId, clientSecret) {
        try {
            // In a real implementation, you would validate against stored client data
            return clientId === this.config.clientId &&
                (!clientSecret || clientSecret === this.config.clientSecret);
        }
        catch (error) {
            logger_1.logger.error('Error validating client:', error);
            return false;
        }
    }
    /**
     * Generate JWKS (JSON Web Key Set)
     */
    generateJWKS() {
        // In a real implementation, you would generate proper RSA keys
        // For now, we'll return a placeholder structure
        return [
            {
                kty: 'RSA',
                kid: 'default-key',
                use: 'sig',
                alg: 'RS256',
                n: 'placeholder-n-value',
                e: 'AQAB'
            }
        ];
    }
    /**
     * Create authorization URL
     */
    createAuthorizationUrl(params) {
        const queryParams = new URLSearchParams({
            response_type: params.responseType || 'code',
            client_id: params.clientId,
            redirect_uri: params.redirectUri,
            scope: params.scope,
            state: params.state
        });
        if (params.nonce) {
            queryParams.append('nonce', params.nonce);
        }
        return `${this.config.issuer}/auth?${queryParams.toString()}`;
    }
    /**
     * Exchange authorization code for tokens
     */
    async exchangeCodeForTokens(params) {
        try {
            // This would typically use the OIDC provider's token endpoint
            // For now, we'll return a mock response
            const mockResponse = {
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                idToken: 'mock-id-token',
                expiresIn: 3600,
                tokenType: 'Bearer'
            };
            logger_1.logger.info(`Token exchange completed for client: ${params.clientId}`);
            return mockResponse;
        }
        catch (error) {
            logger_1.logger.error('Error exchanging code for tokens:', error);
            throw new Error('Failed to exchange authorization code for tokens');
        }
    }
    /**
     * Refresh access token
     */
    async refreshAccessToken(params) {
        try {
            // This would typically use the OIDC provider's token endpoint
            // For now, we'll return a mock response
            const mockResponse = {
                accessToken: 'new-mock-access-token',
                refreshToken: 'new-mock-refresh-token',
                expiresIn: 3600,
                tokenType: 'Bearer'
            };
            logger_1.logger.info(`Token refresh completed for client: ${params.clientId}`);
            return mockResponse;
        }
        catch (error) {
            logger_1.logger.error('Error refreshing access token:', error);
            throw new Error('Failed to refresh access token');
        }
    }
    /**
     * Get user info from access token
     */
    async getUserInfo(accessToken) {
        try {
            // This would typically validate the token and return user information
            // For now, we'll return a mock response
            const mockUserInfo = {
                sub: 'user-123',
                name: 'John Doe',
                given_name: 'John',
                family_name: 'Doe',
                email: 'john.doe@example.com',
                email_verified: true
            };
            logger_1.logger.info('User info retrieved from access token');
            return mockUserInfo;
        }
        catch (error) {
            logger_1.logger.error('Error getting user info:', error);
            throw new Error('Failed to get user information');
        }
    }
    /**
     * Revoke token
     */
    async revokeToken(params) {
        try {
            // This would typically revoke the token in the OIDC provider
            logger_1.logger.info(`Token revoked for client: ${params.clientId}`);
        }
        catch (error) {
            logger_1.logger.error('Error revoking token:', error);
            throw new Error('Failed to revoke token');
        }
    }
    /**
     * Get provider configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Update provider configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // In a real implementation, you might need to recreate the provider
        logger_1.logger.info('OIDC configuration updated');
    }
}
exports.OIDCService = OIDCService;
const createOIDCService = (config) => {
    return new OIDCService(config);
};
exports.createOIDCService = createOIDCService;
//# sourceMappingURL=oidc.service.original.js.map