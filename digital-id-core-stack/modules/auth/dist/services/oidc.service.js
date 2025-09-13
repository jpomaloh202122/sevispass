"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOIDCService = exports.OIDCService = void 0;
const logger_1 = require("../utils/logger");
class OIDCService {
    constructor(config) {
        this.config = config;
        logger_1.logger.info('OIDC Service initialized (stub)');
    }
    async initialize() {
        logger_1.logger.info('OIDC Provider initialized (stub)');
    }
    async createClient(clientData) {
        const client = {
            clientId: clientData.clientId || 'stub-client-id',
            clientSecret: clientData.clientSecret || 'stub-client-secret',
            redirectUris: clientData.redirectUris || ['http://localhost:3000/callback'],
            grantTypes: clientData.grantTypes || ['authorization_code'],
            responseTypes: clientData.responseTypes || ['code'],
            scopes: clientData.scopes || ['openid', 'profile', 'email'],
            isActive: true
        };
        logger_1.logger.info(`Created OIDC client: ${client.clientId} (stub)`);
        return client;
    }
    async getAuthorizationUrl(clientId, redirectUri, state) {
        return `${this.config.issuer}/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+profile+email&state=${state || 'stub-state'}`;
    }
    async exchangeCodeForTokens(code, clientId) {
        return {
            access_token: 'stub-access-token',
            id_token: 'stub-id-token',
            token_type: 'Bearer',
            expires_in: 3600
        };
    }
}
exports.OIDCService = OIDCService;
const createOIDCService = (config) => new OIDCService(config);
exports.createOIDCService = createOIDCService;
//# sourceMappingURL=oidc.service.js.map