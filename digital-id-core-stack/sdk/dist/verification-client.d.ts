import { ClientConfig, ApiResponse } from './types';
export declare class VerificationClient {
    private config;
    constructor(config: ClientConfig);
    verifyFace(imageData: Buffer): Promise<ApiResponse<boolean>>;
    verifyDocument(imageData: Buffer): Promise<ApiResponse<any>>;
}
//# sourceMappingURL=verification-client.d.ts.map