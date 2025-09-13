import { Credential, VerifiableCredential } from '../types';
export declare class CredentialService {
    issueCredential(credentialData: Omit<Credential, 'id'>): Promise<VerifiableCredential>;
    verifyCredential(credential: VerifiableCredential): Promise<boolean>;
}
//# sourceMappingURL=credential.service.d.ts.map