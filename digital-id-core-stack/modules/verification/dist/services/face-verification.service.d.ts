import { FaceVerificationResult, VerificationRequest } from '../types/index';
export declare class FaceVerificationService {
    verifyFace(request: VerificationRequest): Promise<FaceVerificationResult>;
    checkLiveness(imageData: Buffer): Promise<number>;
}
//# sourceMappingURL=face-verification.service.d.ts.map