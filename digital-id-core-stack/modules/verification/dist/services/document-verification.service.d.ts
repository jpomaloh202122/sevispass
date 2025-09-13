import { DocumentExtractionResult, DocumentValidationResult, DocumentVerificationRequest } from '../types/index';
export declare class DocumentVerificationService {
    extractText(imageData: Buffer): Promise<DocumentExtractionResult>;
    validateDocument(request: DocumentVerificationRequest): Promise<DocumentValidationResult>;
}
//# sourceMappingURL=document-verification.service.d.ts.map