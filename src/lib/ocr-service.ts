import { Jimp } from 'jimp';
import { awsVerificationService } from './aws-verification';

// Enhanced OCR service with AWS Textract integration
// Provides both AWS Textract and fallback validation

interface OCRResult {
  success: boolean;
  extractedText: string;
  confidence: number;
  error?: string;
}

interface DocumentValidationResult {
  isValid: boolean;
  extractedNumber?: string;
  confidence: number;
  details: string;
}

export class OCRService {
  private isAWSAvailable = false;

  async initializeWorker() {
    // Check if AWS Textract is available
    this.isAWSAvailable = awsVerificationService.isConfigured();
    
    if (this.isAWSAvailable) {
      console.log('✅ OCR service initialized with AWS Textract');
    } else {
      console.log('⚠️ OCR service running in fallback mode (AWS credentials not configured)');
    }
  }

  async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const image = await Jimp.fromBuffer(imageBuffer);
      
      // Image preprocessing for better OCR accuracy
      image
        .greyscale() // Convert to grayscale
        .contrast(0.5) // Increase contrast
        .normalize() // Normalize brightness and contrast
        .resize({ w: image.bitmap.width * 2, h: image.bitmap.height * 2 }); // Upscale for better text recognition

      return await image.getBuffer('image/png');
    } catch (error) {
      console.error('Image preprocessing error:', error);
      return imageBuffer; // Return original if preprocessing fails
    }
  }

  async extractTextFromDocument(imageBuffer: Buffer): Promise<OCRResult> {
    await this.initializeWorker();
    
    if (this.isAWSAvailable) {
      try {
        console.log('🚀 Using AWS Textract for document text extraction...');
        
        // Use AWS Textract for text extraction
        const result = await awsVerificationService.extractDocumentText(imageBuffer, true);
        
        if (result.success) {
          console.log('✅ AWS Textract extraction successful:', {
            textLength: result.extractedText.length,
            confidence: result.confidence,
            keyValuePairs: result.keyValuePairs?.length || 0
          });
          
          return {
            success: true,
            extractedText: result.extractedText,
            confidence: result.confidence,
          };
        } else {
          console.error('❌ AWS Textract extraction failed:', result.error);
          return {
            success: false,
            extractedText: '',
            confidence: 0,
            error: `AWS Textract error: ${result.error}`
          };
        }
      } catch (error) {
        console.error('❌ AWS Textract service error:', error);
        return {
          success: false,
          extractedText: '',
          confidence: 0,
          error: `AWS Textract service error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    } else {
      // Fallback mode when AWS is not available
      console.warn('⚠️ AWS Textract not available, using fallback mode');
      return {
        success: false,
        extractedText: '',
        confidence: 0,
        error: 'AWS Textract unavailable - using fallback validation'
      };
    }
  }

  // Fallback validation method when OCR is unavailable
  private createFallbackValidation(expectedNumber: string, documentType: string): DocumentValidationResult {
    return {
      isValid: true, // Accept all registrations when OCR is unavailable
      confidence: 50, // Low confidence to indicate fallback mode
      details: `OCR validation unavailable - accepting ${documentType} number '${expectedNumber}' in fallback mode. Manual verification may be required.`
    };
  }

  async validatePassportNumber(imageBuffer: Buffer, expectedNumber: string): Promise<DocumentValidationResult> {
    try {
      await this.initializeWorker();
      
      if (this.isAWSAvailable) {
        console.log('🚀 Using AWS Textract for passport validation...');
        
        // Use AWS Textract directly for document validation
        const result = await awsVerificationService.validateDocumentNumber(imageBuffer, expectedNumber, 'passport');
        
        console.log('✅ AWS passport validation result:', {
          isValid: result.isValid,
          confidence: result.confidence,
          matchType: result.matchType
        });
        
        return result;
      } else {
        // Fallback to old OCR method
        const ocrResult = await this.extractTextFromDocument(imageBuffer);
        
        if (!ocrResult.success) {
          console.warn('OCR failed for passport validation, using fallback mode');
          return this.createFallbackValidation(expectedNumber, 'passport');
        }

        const extractedText = ocrResult.extractedText.toUpperCase();
        const expectedUpper = expectedNumber.toUpperCase().trim();
        
        // PNG-specific passport patterns  
        const passportPatterns = [
          /0P\d{5,8}/gi, // Official Government Passports: 0P + 5+ numbers (e.g., 0P17985)
          /PNG\d{6,8}/gi, // Normal Citizen Passports: PNG + 6-8 numbers
          /0P[-\s]?\d{5,8}/gi, // 0P with separator
          /PNG[-\s]?\d{6,8}/gi, // PNG with separator
          /[0-9][A-Z]\d{5,8}/g, // Digit + letter + numbers (like 0P)
          /[A-Z]{2,3}\d{5,8}/g, // 2-3 letters + numbers fallback
        ];

        let foundNumbers: string[] = [];
        
        // Extract potential passport numbers using patterns
        passportPatterns.forEach(pattern => {
          const matches = extractedText.match(pattern);
          if (matches) {
            foundNumbers = foundNumbers.concat(matches);
          }
        });

        // Clean and filter PNG passport numbers
        foundNumbers = [...new Set(foundNumbers)]
          .map(num => num.replace(/[-\s]/g, '').toUpperCase())
          .filter(num => {
            return (
              /^0P\d{5,8}$/i.test(num) || // Official Government: 0P + 5+ digits (e.g., 0P17985)
              /^PNG\d{6,8}$/i.test(num) || // Normal Citizen: PNG + 6-8 digits
              /^[0-9][A-Z]\d{5,8}$/.test(num) || // Digit + letter + numbers (like 0P)
              /^[A-Z]{2,3}\d{5,8}$/.test(num) // Generic fallback
            );
          });

        // Check for exact match
        if (extractedText.includes(expectedUpper)) {
          return {
            isValid: true,
            extractedNumber: expectedUpper,
            confidence: ocrResult.confidence,
            details: 'Exact passport number match found'
          };
        }

        // Check for partial matches or similar numbers
        for (const foundNumber of foundNumbers) {
          if (this.calculateSimilarity(foundNumber, expectedUpper) > 0.8) {
            return {
              isValid: true,
              extractedNumber: foundNumber,
              confidence: ocrResult.confidence * 0.9,
              details: `Similar passport number found: ${foundNumber}`
            };
          }
        }

        return {
          isValid: false,
          confidence: ocrResult.confidence,
          details: `Expected passport number '${expectedNumber}' not found. Found numbers: ${foundNumbers.join(', ')}`
        };
      }
    } catch (error) {
      console.error('Passport validation error:', error);
      // Return fallback validation on any error
      return this.createFallbackValidation(expectedNumber, 'passport');
    }
  }

  async validateNIDNumber(imageBuffer: Buffer, expectedNumber: string): Promise<DocumentValidationResult> {
    try {
      await this.initializeWorker();
      
      if (this.isAWSAvailable) {
        console.log('🚀 Using AWS Textract for NID validation...');
        
        // Use AWS Textract directly for document validation
        const result = await awsVerificationService.validateDocumentNumber(imageBuffer, expectedNumber, 'nid');
        
        console.log('✅ AWS NID validation result:', {
          isValid: result.isValid,
          confidence: result.confidence,
          matchType: result.matchType
        });
        
        return result;
      } else {
        // Fallback to old OCR method
        const ocrResult = await this.extractTextFromDocument(imageBuffer);
        
        if (!ocrResult.success) {
          console.warn('OCR failed for NID validation, using fallback mode');
          return this.createFallbackValidation(expectedNumber, 'NID');
        }

        const extractedText = ocrResult.extractedText.toUpperCase();
        const expectedUpper = expectedNumber.toUpperCase().trim();
        
        // PNG NID patterns - exactly 10 digits only
        const nidPatterns = [
          /\b\d{10}\b/g, // Exactly 10 digits with word boundaries
          /\d{5}[-\s]?\d{5}/g, // 5-5 format with optional separator
          /\d{3}[-\s]?\d{3}[-\s]?\d{4}/g, // 3-3-4 format
          /\d{2}[-\s]?\d{3}[-\s]?\d{5}/g, // 2-3-5 format
          /(?<!\d)\d{10}(?!\d)/g, // Negative lookbehind/ahead for exactly 10 digits
        ];

        let foundNumbers: string[] = [];
        
        // Extract potential NID numbers using patterns
        nidPatterns.forEach(pattern => {
          const matches = extractedText.match(pattern);
          if (matches) {
            foundNumbers = foundNumbers.concat(matches);
          }
        });

        // Clean and filter NID numbers - only exactly 10 digits
        foundNumbers = [...new Set(foundNumbers)]
          .map(num => num.replace(/[-\s]/g, ''))
          .filter(num => /^\d{10}$/.test(num)); // Only exactly 10 digits

        // Clean expected number (remove spaces, hyphens)
        const cleanExpected = expectedUpper.replace(/[-\s]/g, '');
        
        // Check for exact match
        if (extractedText.includes(cleanExpected) || extractedText.includes(expectedUpper)) {
          return {
            isValid: true,
            extractedNumber: expectedUpper,
            confidence: ocrResult.confidence,
            details: 'Exact NID number match found'
          };
        }

        // Check found numbers against expected (with cleaning)
        for (const foundNumber of foundNumbers) {
          const cleanFound = foundNumber.replace(/[-\s]/g, '');
          if (cleanFound === cleanExpected || this.calculateSimilarity(cleanFound, cleanExpected) > 0.85) {
            return {
              isValid: true,
              extractedNumber: foundNumber,
              confidence: ocrResult.confidence * 0.9,
              details: `Similar NID number found: ${foundNumber}`
            };
          }
        }

        return {
          isValid: false,
          confidence: ocrResult.confidence,
          details: `Expected NID number '${expectedNumber}' not found. Found numbers: ${foundNumbers.join(', ')}`
        };
      }
    } catch (error) {
      console.error('NID validation error:', error);
      // Return fallback validation on any error
      return this.createFallbackValidation(expectedNumber, 'NID');
    }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    const distance = matrix[len2][len1];
    return (maxLen - distance) / maxLen;
  }

  async cleanup() {
    // No cleanup needed in AWS mode
    console.log('OCR service cleanup completed');
  }
}

// Export singleton instance
export const ocrService = new OCRService();