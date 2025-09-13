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
  blocks?: any[];
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

export interface DuplicateMatch {
  applicationId: string;
  matchType: 'employee_number' | 'email' | 'name_dob' | 'nid_hash' | 'exact_match' | 'biometric_face' | 'biometric_fingerprint' | 'document_similarity' | 'address_geolocation' | 'phone_number' | 'cross_reference';
  matchScore: number;
  existingApplication: any;
  duplicateFields: string[];
  confidence: 'high' | 'medium' | 'low';
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  metadata?: {
    biometricSimilarity?: number;
    documentHash?: string;
    geolocationDistance?: number;
    phoneMatchType?: 'exact' | 'similar' | 'formatted';
    crossReferenceSource?: string;
  };
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matches: DuplicateMatch[];
  canProceed: boolean;
  warningMessage?: string;
  blockingMessage?: string;
  overallRiskLevel: 'critical' | 'high' | 'medium' | 'low';
  requiresManualReview: boolean;
  autoResolvable: boolean;
  statistics: {
    totalMatches: number;
    criticalMatches: number;
    highRiskMatches: number;
    mediumRiskMatches: number;
    lowRiskMatches: number;
  };
}

export interface VerificationRequest {
  sourceImage: Buffer;
  targetImage: Buffer;
  livenessVerified?: boolean;
  similarityThreshold?: number;
}

export interface DocumentVerificationRequest {
  documentImage: Buffer;
  expectedNumber: string;
  documentType: 'passport' | 'nid';
}

export interface DuplicateCheckRequest {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  workEmail: string;
  employeeNumber: string;
  department: string;
  address: string;
  phoneNumber?: string;
  nidNumber?: string;
  biometricData?: {
    facePhoto?: string;
    fingerprint?: string;
  };
  documents?: {
    nidDocument?: string;
    policeClearance?: string;
    medicalCertificate?: string;
  };
}

export interface VerificationError extends Error {
  code: string;
  statusCode: number;
}

export class VerificationError extends Error implements VerificationError {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = 'VERIFICATION_ERROR', statusCode: number = 500) {
    super(message);
    this.name = 'VerificationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class BiometricError extends Error implements VerificationError {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = 'BIOMETRIC_ERROR', statusCode: number = 422) {
    super(message);
    this.name = 'BiometricError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class DocumentError extends Error implements VerificationError {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = 'DOCUMENT_ERROR', statusCode: number = 422) {
    super(message);
    this.name = 'DocumentError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class DuplicateError extends Error implements VerificationError {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = 'DUPLICATE_ERROR', statusCode: number = 409) {
    super(message);
    this.name = 'DuplicateError';
    this.code = code;
    this.statusCode = statusCode;
  }
}