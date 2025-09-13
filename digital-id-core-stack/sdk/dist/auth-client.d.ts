import { ClientConfig, ApiResponse } from './types';
export declare class AuthClient {
    private config;
    constructor(config: ClientConfig);
    login(username: string, password: string): Promise<ApiResponse<{
        token: string;
    }>>;
    verify2FA(token: string, code: string): Promise<ApiResponse<boolean>>;
}
//# sourceMappingURL=auth-client.d.ts.map