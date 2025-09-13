import { CredentialService } from './credential.service';
import { Credential } from '../types';

describe('CredentialService', () => {
  let service: CredentialService;

  beforeEach(() => {
    service = new CredentialService();
  });

  describe('issueCredential', () => {
    it('should throw not implemented error', async () => {
      const credentialData: Omit<Credential, 'id'> = {
        type: 'IdentityCard',
        issuer: 'test-issuer',
        subject: 'test-subject',
        issuanceDate: new Date(),
        claims: { name: 'Test User' }
      };

      await expect(service.issueCredential(credentialData)).rejects.toThrow('Not implemented');
    });
  });

  describe('verifyCredential', () => {
    it('should throw not implemented error', async () => {
      const credential = {
        id: 'test-id',
        type: 'IdentityCard',
        issuer: 'test-issuer',
        subject: 'test-subject',
        issuanceDate: new Date(),
        claims: { name: 'Test User' },
        proof: {
          type: 'Ed25519Signature2018',
          signature: 'test-signature',
          created: new Date()
        }
      };

      await expect(service.verifyCredential(credential)).rejects.toThrow('Not implemented');
    });
  });
});