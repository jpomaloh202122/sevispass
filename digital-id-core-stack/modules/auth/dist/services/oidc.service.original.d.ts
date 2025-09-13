import Provider from 'oidc-provider';
import { OIDCConfig, OIDCClient } from '../types';
export declare class OIDCService {
    private provider;
    private config;
    constructor(config: OIDCConfig);
    /**
     * Create and configure OIDC provider
     */
    private createProvider;
    /**
     * Get the OIDC provider instance
     */
    getProvider(): Provider;
    /**
     * Get discovery document
     */
    getDiscoveryDocument(): any;
    /**
     * Register a new OIDC client
     */
    registerClient(client: OIDCClient): Promise<void>;
    /**
     * Validate client credentials
     */
    validateClient(clientId: string, clientSecret?: string): Promise<boolean>;
    /**
     * Generate JWKS (JSON Web Key Set)
     */
    private generateJWKS;
    /**
     * Create authorization URL
     */
    createAuthorizationUrl(params: {
        clientId: string;
        redirectUri: string;
        scope: string;
        state: string;
        nonce?: string;
        responseType?: string;
    }): string;
    /**
     * Exchange authorization code for tokens
     */
    exchangeCodeForTokens(params: {
        code: string;
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    }): Promise<{
        accessToken: string;
        refreshToken?: string;
        idToken?: string;
        expiresIn: number;
        tokenType: string;
    }>;
    /**
     * Refresh access token
     */
    refreshAccessToken(params: {
        refreshToken: string;
        clientId: string;
        clientSecret: string;
    }): Promise<{
        accessToken: string;
        refreshToken?: string;
        expiresIn: number;
        tokenType: string;
    }>;
    /**
     * Get user info from access token
     */
    getUserInfo(accessToken: string): Promise<any>;
    /**
     * Revoke token
     */
    revokeToken(params: {
        token: string;
        clientId: string;
        clientSecret: string;
    }): Promise<void>;
    /**
     * Get provider configuration
     */
    getConfig(): OIDCConfig;
    /**
     * Update provider configuration
     */
    updateConfig(newConfig: Partial<OIDCConfig>): void;
}
export declare const createOIDCService: (config: OIDCConfig) => OIDCService;
//# sourceMappingURL=oidc.service.original.d.ts.map