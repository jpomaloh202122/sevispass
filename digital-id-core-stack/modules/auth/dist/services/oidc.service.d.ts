import { OIDCConfig, OIDCClient } from '../types';
export declare class OIDCService {
    private config;
    constructor(config: OIDCConfig);
    initialize(): Promise<void>;
    createClient(clientData: Partial<OIDCClient>): Promise<OIDCClient>;
    getAuthorizationUrl(clientId: string, redirectUri: string, state?: string): Promise<string>;
    exchangeCodeForTokens(code: string, clientId: string): Promise<any>;
}
export declare const createOIDCService: (config: OIDCConfig) => OIDCService;
//# sourceMappingURL=oidc.service.d.ts.map