import { ClientConfig, ApiResponse } from './types';
export declare class CredentialsClient {
    private config;
    constructor(config: ClientConfig);
    issueCredential(credentialData: any): Promise<ApiResponse<any>>;
    verifyCredential(credential: any): Promise<ApiResponse<boolean>>;
}
//# sourceMappingURL=credentials-client.d.ts.map