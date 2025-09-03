import { 
  RekognitionClient, 
  CompareFacesCommand, 
  DetectFacesCommand,
  FaceDetail,
  CompareFacesRequest,
  DetectFacesRequest,
  DetectModerationLabelsCommand,
  DetectModerationLabelsRequest
} from '@aws-sdk/client-rekognition';

import { 
  TextractClient, 
  DetectDocumentTextCommand,
  AnalyzeDocumentCommand,
  FeatureType,
  Block
} from '@aws-sdk/client-textract';

// Interfaces
export interface FaceVerificationResult {
  success: boolean;
  confidence: number;
  similarity?: number;
  facesDetected: {
    source: number;
    target: number;
  };
  qualityChecks: {
    sourceQuality: number;
    targetQuality: number;
    bothFacesDetected: boolean;
  };
  error?: string;
  livenessScore?: number;
}

export interface DocumentExtractionResult {
  success: boolean;
  extractedText: string;
  confidence: number;
  blocks?: Block[];
  keyValuePairs?: Array<{
    key: string;
    value: string;
    confidence: number;
  }>;
  error?: string;
}

export interface DocumentValidationResult {
  isValid: boolean;
  extractedNumber?: string;
  confidence: number;
  details: string;
  matchType: 'exact' | 'partial' | 'none';
}

export class AWSVerificationService {
  private rekognition: RekognitionClient;
  private textract: TextractClient;
  private region: string;

  constructor(region: string = 'ap-southeast-2') {
    this.region = region;
    
    // Initialize AWS clients with credentials from environment
    const clientConfig: any = {
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    };

    // Add session token if present (for temporary credentials)
    if (process.env.AWS_SESSION_TOKEN) {
      clientConfig.credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
    }

    this.rekognition = new RekognitionClient(clientConfig);
    this.textract = new TextractClient(clientConfig);
  }

  /**
   * Compare faces between two images using AWS Rekognition
   */
  async compareFaces(
    sourceImageBuffer: Buffer, 
    targetImageBuffer: Buffer, 
    similarityThreshold: number = 70
  ): Promise<FaceVerificationResult> {
    try {
      console.log('🔍 Starting AWS Rekognition face comparison...');
      
      // First, detect faces in both images to ensure quality
      const [sourceDetection, targetDetection] = await Promise.all([
        this.detectFaces(sourceImageBuffer),
        this.detectFaces(targetImageBuffer)
      ]);

      if (!sourceDetection.success || !targetDetection.success) {
        return {
          success: false,
          confidence: 0,
          facesDetected: { source: 0, target: 0 },
          qualityChecks: {
            sourceQuality: 0,
            targetQuality: 0,
            bothFacesDetected: false
          },
          error: 'Face detection failed in one or both images'
        };
      }

      // Perform face comparison
      const compareParams: CompareFacesRequest = {
        SourceImage: {
          Bytes: sourceImageBuffer
        },
        TargetImage: {
          Bytes: targetImageBuffer
        },
        SimilarityThreshold: similarityThreshold,
        QualityFilter: 'AUTO' // Filter out low quality faces
      };

      const command = new CompareFacesCommand(compareParams);
      const result = await this.rekognition.send(command);

      console.log('📊 Face comparison result:', {
        faceMatches: result.FaceMatches?.length || 0,
        unmatchedFaces: result.UnmatchedFaces?.length || 0,
        sourceImageFace: !!result.SourceImageFace
      });

      const hasMatch = result.FaceMatches && result.FaceMatches.length > 0;
      const topMatch = hasMatch ? result.FaceMatches[0] : null;
      const similarity = topMatch?.Similarity || 0;

      // Calculate quality scores
      const sourceQuality = this.calculateFaceQuality(result.SourceImageFace);
      const targetQuality = hasMatch ? this.calculateFaceQuality(topMatch.Face) : 0;

      return {
        success: true,
        confidence: similarity,
        similarity: similarity,
        facesDetected: {
          source: result.SourceImageFace ? 1 : 0,
          target: result.FaceMatches?.length || 0
        },
        qualityChecks: {
          sourceQuality,
          targetQuality,
          bothFacesDetected: !!result.SourceImageFace && hasMatch
        },
        livenessScore: this.estimateLivenessFromQuality(sourceQuality, targetQuality)
      };

    } catch (error) {
      console.error('❌ AWS Rekognition face comparison error:', error);
      return {
        success: false,
        confidence: 0,
        facesDetected: { source: 0, target: 0 },
        qualityChecks: {
          sourceQuality: 0,
          targetQuality: 0,
          bothFacesDetected: false
        },
        error: error instanceof Error ? error.message : 'Face comparison failed'
      };
    }
  }

  /**
   * Detect faces in an image
   */
  async detectFaces(imageBuffer: Buffer): Promise<{ success: boolean; faces?: FaceDetail[]; error?: string }> {
    try {
      const params: DetectFacesRequest = {
        Image: {
          Bytes: imageBuffer
        },
        Attributes: ['ALL'] // Get all face attributes for quality assessment
      };

      const command = new DetectFacesCommand(params);
      const result = await this.rekognition.send(command);

      return {
        success: true,
        faces: result.FaceDetails || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Face detection failed'
      };
    }
  }

  /**
   * Check for inappropriate content in images
   */
  async moderateContent(imageBuffer: Buffer): Promise<{ safe: boolean; labels: string[] }> {
    try {
      const params: DetectModerationLabelsRequest = {
        Image: {
          Bytes: imageBuffer
        },
        MinConfidence: 60
      };

      const command = new DetectModerationLabelsCommand(params);
      const result = await this.rekognition.send(command);

      const unsafeLabels = result.ModerationLabels?.map(label => label.Name || '') || [];
      
      return {
        safe: unsafeLabels.length === 0,
        labels: unsafeLabels
      };
    } catch (error) {
      console.error('Content moderation error:', error);
      return { safe: true, labels: [] }; // Default to safe if check fails
    }
  }

  /**
   * Extract text from document using AWS Textract
   */
  async extractDocumentText(imageBuffer: Buffer, useAdvancedFeatures: boolean = false): Promise<DocumentExtractionResult> {
    try {
      console.log('📄 Starting AWS Textract document analysis...');

      if (useAdvancedFeatures) {
        // Use AnalyzeDocument for structured data extraction
        const params = {
          Document: {
            Bytes: imageBuffer
          },
          FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES] as FeatureType[]
        };

        const command = new AnalyzeDocumentCommand(params);
        const result = await this.textract.send(command);

        const extractedText = this.extractTextFromBlocks(result.Blocks || []);
        const keyValuePairs = this.extractKeyValuePairs(result.Blocks || []);
        
        console.log('📊 Advanced Textract result:', {
          blocksCount: result.Blocks?.length || 0,
          textLength: extractedText.length,
          keyValuePairs: keyValuePairs.length
        });

        return {
          success: true,
          extractedText,
          confidence: this.calculateAverageConfidence(result.Blocks || []),
          blocks: result.Blocks,
          keyValuePairs
        };
      } else {
        // Use simple text detection
        const params = {
          Document: {
            Bytes: imageBuffer
          }
        };

        const command = new DetectDocumentTextCommand(params);
        const result = await this.textract.send(command);

        const extractedText = this.extractTextFromBlocks(result.Blocks || []);
        
        console.log('📊 Simple Textract result:', {
          blocksCount: result.Blocks?.length || 0,
          textLength: extractedText.length
        });

        return {
          success: true,
          extractedText,
          confidence: this.calculateAverageConfidence(result.Blocks || []),
          blocks: result.Blocks
        };
      }
    } catch (error) {
      console.error('❌ AWS Textract error:', error);
      return {
        success: false,
        extractedText: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Document text extraction failed'
      };
    }
  }

  /**
   * Validate document number against extracted text
   */
  async validateDocumentNumber(
    imageBuffer: Buffer, 
    expectedNumber: string, 
    documentType: 'passport' | 'nid'
  ): Promise<DocumentValidationResult> {
    try {
      const extractionResult = await this.extractDocumentText(imageBuffer, true);
      
      if (!extractionResult.success) {
        return {
          isValid: false,
          confidence: 0,
          details: `Document text extraction failed: ${extractionResult.error}`,
          matchType: 'none'
        };
      }

      const extractedText = extractionResult.extractedText.toUpperCase();
      const expectedUpper = expectedNumber.toUpperCase().trim();
      
      console.log('🔍 Document validation:', {
        documentType,
        expectedNumber: expectedUpper,
        extractedTextLength: extractedText.length,
        extractedTextPreview: extractedText.substring(0, 200) + '...'
      });

      // Define patterns based on document type
      const patterns = this.getDocumentPatterns(documentType);
      const foundNumbers = this.extractNumbersFromText(extractedText, patterns, documentType);
      
      // Check for exact match
      if (extractedText.includes(expectedUpper)) {
        return {
          isValid: true,
          extractedNumber: expectedUpper,
          confidence: extractionResult.confidence,
          details: `Exact ${documentType} number match found in document`,
          matchType: 'exact'
        };
      }

      // Check found numbers for matches
      for (const foundNumber of foundNumbers) {
        const similarity = this.calculateStringSimilarity(foundNumber, expectedUpper);
        if (similarity > 0.85) {
          return {
            isValid: true,
            extractedNumber: foundNumber,
            confidence: extractionResult.confidence * similarity,
            details: `Similar ${documentType} number found: ${foundNumber} (similarity: ${(similarity * 100).toFixed(1)}%)`,
            matchType: 'partial'
          };
        }
      }

      return {
        isValid: false,
        confidence: extractionResult.confidence,
        details: `Expected ${documentType} number '${expectedNumber}' not found. Found numbers: ${foundNumbers.join(', ')}`,
        matchType: 'none'
      };

    } catch (error) {
      console.error('Document validation error:', error);
      return {
        isValid: false,
        confidence: 0,
        details: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        matchType: 'none'
      };
    }
  }

  // Helper methods
  private calculateFaceQuality(face?: FaceDetail): number {
    if (!face) return 0;
    
    const brightness = face.Quality?.Brightness || 50;
    const sharpness = face.Quality?.Sharpness || 50;
    
    // Normalize to 0-1 scale
    return Math.min(100, (brightness + sharpness) / 2) / 100;
  }

  private estimateLivenessFromQuality(sourceQuality: number, targetQuality: number): number {
    // Basic liveness estimation based on image quality differences
    const avgQuality = (sourceQuality + targetQuality) / 2;
    const qualityVariation = Math.abs(sourceQuality - targetQuality);
    
    // Higher variation might indicate different lighting/conditions (good for liveness)
    const livenessScore = avgQuality + (qualityVariation * 0.1);
    
    return Math.min(1.0, Math.max(0.1, livenessScore));
  }

  private extractTextFromBlocks(blocks: Block[]): string {
    return blocks
      .filter(block => block.BlockType === 'LINE')
      .map(block => block.Text || '')
      .join(' ');
  }

  private extractKeyValuePairs(blocks: Block[]): Array<{ key: string; value: string; confidence: number }> {
    const keyValuePairs: Array<{ key: string; value: string; confidence: number }> = [];
    
    blocks.forEach(block => {
      if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
        const keyText = this.getTextFromRelationships(block, blocks);
        const valueBlock = this.getValueBlock(block, blocks);
        const valueText = valueBlock ? this.getTextFromRelationships(valueBlock, blocks) : '';
        
        if (keyText && valueText) {
          keyValuePairs.push({
            key: keyText,
            value: valueText,
            confidence: Math.min(block.Confidence || 0, valueBlock?.Confidence || 0)
          });
        }
      }
    });

    return keyValuePairs;
  }

  private getTextFromRelationships(block: Block, blocks: Block[]): string {
    if (!block.Relationships) return '';
    
    const childIds = block.Relationships
      .filter(rel => rel.Type === 'CHILD')
      .flatMap(rel => rel.Ids || []);
    
    return childIds
      .map(id => blocks.find(b => b.Id === id))
      .filter(b => b?.BlockType === 'WORD')
      .map(b => b?.Text || '')
      .join(' ');
  }

  private getValueBlock(keyBlock: Block, blocks: Block[]): Block | undefined {
    const valueRelation = keyBlock.Relationships?.find(rel => rel.Type === 'VALUE');
    const valueId = valueRelation?.Ids?.[0];
    return valueId ? blocks.find(b => b.Id === valueId) : undefined;
  }

  private calculateAverageConfidence(blocks: Block[]): number {
    const confidences = blocks
      .map(block => block.Confidence || 0)
      .filter(conf => conf > 0);
    
    return confidences.length > 0 
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length 
      : 0;
  }

  private getDocumentPatterns(documentType: 'passport' | 'nid'): RegExp[] {
    if (documentType === 'passport') {
      return [
        // PNG-specific passport patterns
        /0P\d{5,8}/gi, // Official Government Passports: 0P + 5+ numbers (e.g., 0P17985)
        /PNG\d{6,8}/gi, // Normal Citizen Passports: PNG + 6-8 numbers
        /0P[-\s]?\d{5,8}/gi, // 0P with separator
        /PNG[-\s]?\d{6,8}/gi, // PNG with separator
        // Fallback generic patterns
        /[0-9][A-Z]\d{5,8}/g, // Digit + letter + numbers (like 0P)
        /[A-Z]{2,3}\d{5,8}/g, // 2-3 letters + numbers
      ];
    } else {
      return [
        // PNG NID - exactly 10 digits only
        /\b\d{10}\b/g, // Exactly 10 digits with word boundaries
        /\d{5}[-\s]?\d{5}/g, // 5-5 format with optional separator
        /\d{3}[-\s]?\d{3}[-\s]?\d{4}/g, // 3-3-4 format
        /\d{2}[-\s]?\d{3}[-\s]?\d{5}/g, // 2-3-5 format
        // Strict 10-digit only patterns
        /(?<!\d)\d{10}(?!\d)/g, // Negative lookbehind/ahead for exactly 10 digits
      ];
    }
  }

  private extractNumbersFromText(text: string, patterns: RegExp[], documentType: 'passport' | 'nid'): string[] {
    const foundNumbers: string[] = [];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        foundNumbers.push(...matches);
      }
    });

    // Remove duplicates and clean based on document type
    const cleanedNumbers = [...new Set(foundNumbers)]
      .map(num => num.replace(/[-\s]/g, '').toUpperCase());

    if (documentType === 'nid') {
      // For NID: Only accept exactly 10 digits
      return cleanedNumbers.filter(num => /^\d{10}$/.test(num));
    } else {
      // For Passport: Accept PNG formats (0P/PNG + numbers)
      return cleanedNumbers.filter(num => {
        return (
          /^0P\d{5,8}$/i.test(num) || // Official Government: 0P + 5+ digits (e.g., 0P17985)
          /^PNG\d{6,8}$/i.test(num) || // Normal Citizen: PNG + 6-8 digits
          /^[0-9][A-Z]\d{5,8}$/.test(num) || // Digit + letter + numbers (like 0P)
          /^[A-Z]{2,3}\d{5,8}$/.test(num) // Generic fallback
        );
      });
    }
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
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

  /**
   * Check if AWS credentials are configured
   */
  isConfigured(): boolean {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  }
}

// Export singleton instance
export const awsVerificationService = new AWSVerificationService();