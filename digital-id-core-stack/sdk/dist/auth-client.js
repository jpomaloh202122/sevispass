"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthClient = void 0;
class AuthClient {
    constructor(config) {
        this.config = config;
    }
    async login(username, password) {
        // Placeholder implementation
        throw new Error('Not implemented');
    }
    async verify2FA(token, code) {
        // Placeholder implementation
        throw new Error('Not implemented');
    }
}
exports.AuthClient = AuthClient;
//# sourceMappingURL=auth-client.js.map