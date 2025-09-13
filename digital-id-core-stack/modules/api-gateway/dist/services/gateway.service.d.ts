import { GatewayConfig, Route } from '../types';
export declare class GatewayService {
    private config;
    constructor(config: GatewayConfig);
    routeRequest(path: string, method: string): Promise<Route | null>;
    validateAuth(token: string): Promise<boolean>;
}
//# sourceMappingURL=gateway.service.d.ts.map