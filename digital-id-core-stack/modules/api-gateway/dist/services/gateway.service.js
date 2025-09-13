"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayService = void 0;
class GatewayService {
    constructor(config) {
        this.config = config;
    }
    async routeRequest(path, method) {
        return this.config.routes.find(route => route.path === path && route.method.toLowerCase() === method.toLowerCase()) || null;
    }
    async validateAuth(token) {
        // Placeholder implementation
        throw new Error('Not implemented');
    }
}
exports.GatewayService = GatewayService;
//# sourceMappingURL=gateway.service.js.map