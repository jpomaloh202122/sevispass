import { DuplicateCheckResult, DuplicateCheckRequest } from '../types/index';
export declare class DuplicateDetectionService {
    checkForDuplicates(request: DuplicateCheckRequest): Promise<DuplicateCheckResult>;
    resolveDuplicate(applicationId: string, action: 'merge' | 'ignore' | 'flag'): Promise<boolean>;
}
//# sourceMappingURL=duplicate-detection.service.d.ts.map