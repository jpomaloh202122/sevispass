import { FaceVerificationService } from './face-verification.service';
import { VerificationRequest } from '../types';

describe('FaceVerificationService', () => {
  let service: FaceVerificationService;

  beforeEach(() => {
    service = new FaceVerificationService();
  });

  describe('verifyFace', () => {
    it('should throw not implemented error', async () => {
      const request: VerificationRequest = {
        sourceImage: Buffer.from('test-source'),
        targetImage: Buffer.from('test-target')
      };

      await expect(service.verifyFace(request)).rejects.toThrow('Not implemented');
    });
  });

  describe('checkLiveness', () => {
    it('should throw not implemented error', async () => {
      const imageData = Buffer.from('test-image');

      await expect(service.checkLiveness(imageData)).rejects.toThrow('Not implemented');
    });
  });
});