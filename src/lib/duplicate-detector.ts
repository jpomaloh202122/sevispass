import { readFile } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface DuplicateMatch {
  applicationId: string;
  matchType: 'employee_number' | 'email' | 'name_dob' | 'nid_hash' | 'exact_match' | 'biometric_face' | 'biometric_fingerprint' | 'document_similarity' | 'address_geolocation' | 'phone_number' | 'cross_reference';
  matchScore: number; // 0-100, 100 being exact match
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

export class PublicServantDuplicateDetector {
  private registryDir: string;

  constructor() {
    this.registryDir = path.join(process.cwd(), 'data', 'public-servant-applications');
  }

  /**
   * Check for duplicates across multiple criteria with advanced algorithms
   */
  async checkForDuplicates(applicationData: {
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
  }): Promise<DuplicateCheckResult> {
    if (!existsSync(this.registryDir)) {
      return { 
        isDuplicate: false, 
        matches: [], 
        canProceed: true,
        overallRiskLevel: 'low',
        requiresManualReview: false,
        autoResolvable: true,
        statistics: {
          totalMatches: 0,
          criticalMatches: 0,
          highRiskMatches: 0,
          mediumRiskMatches: 0,
          lowRiskMatches: 0
        }
      };
    }

    const matches: DuplicateMatch[] = [];
    const applicationFiles = readdirSync(this.registryDir);

    for (const filename of applicationFiles) {
      if (filename.endsWith('.json')) {
        try {
          const filePath = path.join(this.registryDir, filename);
          const existingData = await readFile(filePath, 'utf-8');
          const existingApp = JSON.parse(existingData);

          // Skip if same user updating their application
          if (existingApp.userId === applicationData.userId) {
            continue;
          }

          // Perform comprehensive duplicate checking
          const matchResults = await this.compareApplicationsAdvanced(applicationData, existingApp);
          matches.push(...matchResults);
        } catch (error) {
          console.error(`Error reading application file ${filename}:`, error);
        }
      }
    }

    return this.evaluateDuplicatesAdvanced(matches);
  }

  /**
   * Advanced comparison method with multiple detection algorithms
   */
  private async compareApplicationsAdvanced(newApp: any, existingApp: any): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];

    // 1. Employee Number Match (CRITICAL)
    if (newApp.employeeNumber === existingApp.employeeNumber) {
      matches.push({
        applicationId: existingApp.id,
        matchType: 'employee_number',
        matchScore: 100,
        existingApplication: existingApp,
        duplicateFields: ['employeeNumber'],
        confidence: 'high',
        riskLevel: 'critical'
      });
    }

    // 2. Work Email Match (CRITICAL)
    if (newApp.workEmail?.toLowerCase() === existingApp.workEmail?.toLowerCase()) {
      matches.push({
        applicationId: existingApp.id,
        matchType: 'email',
        matchScore: 100,
        existingApplication: existingApp,
        duplicateFields: ['workEmail'],
        confidence: 'high',
        riskLevel: 'critical'
      });
    }

    // 3. NID Number Match (CRITICAL)
    if (newApp.nidNumber && existingApp.nidNumber && newApp.nidNumber === existingApp.nidNumber) {
      matches.push({
        applicationId: existingApp.id,
        matchType: 'nid_hash',
        matchScore: 100,
        existingApplication: existingApp,
        duplicateFields: ['nidNumber'],
        confidence: 'high',
        riskLevel: 'critical'
      });
    }

    // 4. Phone Number Match (HIGH)
    if (newApp.phoneNumber && existingApp.phoneNumber) {
      const phoneMatch = this.comparePhoneNumbers(newApp.phoneNumber, existingApp.phoneNumber);
      if (phoneMatch.isMatch) {
        matches.push({
          applicationId: existingApp.id,
          matchType: 'phone_number',
          matchScore: phoneMatch.score,
          existingApplication: existingApp,
          duplicateFields: ['phoneNumber'],
          confidence: phoneMatch.confidence,
          riskLevel: 'high',
          metadata: {
            phoneMatchType: phoneMatch.type
          }
        });
      }
    }

    // 5. Name and Date of Birth Match (HIGH)
    const nameMatch = this.compareNames(newApp, existingApp);
    if (nameMatch.isMatch && newApp.dateOfBirth === existingApp.dateOfBirth) {
      matches.push({
        applicationId: existingApp.id,
        matchType: 'name_dob',
        matchScore: Math.min(nameMatch.score + 15, 100),
        existingApplication: existingApp,
        duplicateFields: ['firstName', 'lastName', 'dateOfBirth'],
        confidence: 'high',
        riskLevel: 'high'
      });
    }

    // 6. Address Geolocation Match (MEDIUM)
    if (newApp.address && existingApp.address) {
      const addressMatch = this.compareAddresses(newApp.address, existingApp.address);
      if (addressMatch.isMatch) {
        matches.push({
          applicationId: existingApp.id,
          matchType: 'address_geolocation',
          matchScore: addressMatch.score,
          existingApplication: existingApp,
          duplicateFields: ['address'],
          confidence: addressMatch.confidence,
          riskLevel: 'medium',
          metadata: {
            geolocationDistance: addressMatch.distance
          }
        });
      }
    }

    // 7. Document Similarity Check (MEDIUM)
    if (newApp.documents && existingApp.documents) {
      const documentMatch = await this.compareDocuments(newApp.documents, existingApp.documents);
      if (documentMatch.isMatch) {
        matches.push({
          applicationId: existingApp.id,
          matchType: 'document_similarity',
          matchScore: documentMatch.score,
          existingApplication: existingApp,
          duplicateFields: documentMatch.duplicateFields,
          confidence: documentMatch.confidence,
          riskLevel: 'medium',
          metadata: {
            documentHash: documentMatch.hash
          }
        });
      }
    }

    // 8. Biometric Face Recognition (HIGH)
    if (newApp.biometricData?.facePhoto && existingApp.biometricData?.facePhoto) {
      const faceMatch = await this.compareFaceBiometrics(newApp.biometricData.facePhoto, existingApp.biometricData.facePhoto);
      if (faceMatch.isMatch) {
        matches.push({
          applicationId: existingApp.id,
          matchType: 'biometric_face',
          matchScore: faceMatch.score,
          existingApplication: existingApp,
          duplicateFields: ['facePhoto'],
          confidence: faceMatch.confidence,
          riskLevel: 'high',
          metadata: {
            biometricSimilarity: faceMatch.similarity
          }
        });
      }
    }

    // 9. Biometric Fingerprint Match (HIGH)
    if (newApp.biometricData?.fingerprint && existingApp.biometricData?.fingerprint) {
      const fingerprintMatch = await this.compareFingerprintBiometrics(newApp.biometricData.fingerprint, existingApp.biometricData.fingerprint);
      if (fingerprintMatch.isMatch) {
        matches.push({
          applicationId: existingApp.id,
          matchType: 'biometric_fingerprint',
          matchScore: fingerprintMatch.score,
          existingApplication: existingApp,
          duplicateFields: ['fingerprint'],
          confidence: fingerprintMatch.confidence,
          riskLevel: 'high',
          metadata: {
            biometricSimilarity: fingerprintMatch.similarity
          }
        });
      }
    }

    // 10. Cross-reference with external databases (MEDIUM)
    const crossRefMatch = await this.checkCrossReferences(newApp, existingApp);
    if (crossRefMatch.isMatch) {
      matches.push({
        applicationId: existingApp.id,
        matchType: 'cross_reference',
        matchScore: crossRefMatch.score,
        existingApplication: existingApp,
        duplicateFields: crossRefMatch.duplicateFields,
        confidence: crossRefMatch.confidence,
        riskLevel: 'medium',
        metadata: {
          crossReferenceSource: crossRefMatch.source
        }
      });
    }

    return matches;
  }

  /**
   * Legacy comparison method for backward compatibility
   */
  private compareApplications(newApp: any, existingApp: any): DuplicateMatch | null {
    const duplicateFields: string[] = [];
    let matchScore = 0;
    let matchType: DuplicateMatch['matchType'] = 'name_dob';

    // 1. Employee Number Match (CRITICAL - should be unique)
    if (newApp.employeeNumber === existingApp.employeeNumber) {
      duplicateFields.push('employeeNumber');
      matchScore += 50;
      matchType = 'employee_number';
    }

    // 2. Work Email Match (CRITICAL - should be unique per person)
    if (newApp.workEmail.toLowerCase() === existingApp.workEmail.toLowerCase()) {
      duplicateFields.push('workEmail');
      matchScore += 40;
      if (matchType !== 'employee_number') {
        matchType = 'email';
      }
    }

    // 3. Name and Date of Birth Match (STRONG indicator)
    const nameMatch = this.compareNames(newApp, existingApp);
    if (nameMatch.isMatch) {
      duplicateFields.push('name');
      matchScore += nameMatch.score;
    }

    if (newApp.dateOfBirth === existingApp.dateOfBirth) {
      duplicateFields.push('dateOfBirth');
      matchScore += 15;
      
      // Strong match if name + DOB match
      if (nameMatch.isMatch && nameMatch.score > 20) {
        matchType = 'name_dob';
      }
    }

    // 4. Address Similarity (MODERATE indicator)
    const addressSimilarity = this.calculateStringSimilarity(
      newApp.address.toLowerCase(),
      existingApp.address.toLowerCase()
    );
    if (addressSimilarity > 0.8) {
      duplicateFields.push('address');
      matchScore += Math.floor(addressSimilarity * 10);
    }

    // 5. Department Match (WEAK indicator - many people can work in same dept)
    if (newApp.department === existingApp.department) {
      duplicateFields.push('department');
      matchScore += 2;
    }

    // Only consider it a potential duplicate if score is significant
    if (matchScore >= 25 || duplicateFields.length >= 2) {
      return {
        applicationId: existingApp.id,
        matchType,
        matchScore: Math.min(matchScore, 100),
        existingApplication: existingApp,
        duplicateFields
      };
    }

    return null;
  }

  /**
   * Compare names with fuzzy matching
   */
  private compareNames(app1: any, app2: any): { isMatch: boolean; score: number } {
    const name1 = `${app1.firstName} ${app1.lastName}`.toLowerCase();
    const name2 = `${app2.firstName} ${app2.lastName}`.toLowerCase();

    // Exact match
    if (name1 === name2) {
      return { isMatch: true, score: 30 };
    }

    // Check reversed names (John Doe vs Doe John)
    const reversedName1 = `${app1.lastName} ${app1.firstName}`.toLowerCase();
    if (reversedName1 === name2 || name1 === reversedName1) {
      return { isMatch: true, score: 28 };
    }

    // Fuzzy string similarity
    const similarity = this.calculateStringSimilarity(name1, name2);
    if (similarity > 0.85) {
      return { isMatch: true, score: Math.floor(similarity * 25) };
    }

    // Check individual names
    const firstNameSim = this.calculateStringSimilarity(
      app1.firstName.toLowerCase(),
      app2.firstName.toLowerCase()
    );
    const lastNameSim = this.calculateStringSimilarity(
      app1.lastName.toLowerCase(),
      app2.lastName.toLowerCase()
    );

    if (firstNameSim > 0.9 && lastNameSim > 0.9) {
      return { isMatch: true, score: 22 };
    }

    return { isMatch: false, score: 0 };
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Compare phone numbers with various formats
   */
  private comparePhoneNumbers(phone1: string, phone2: string): {
    isMatch: boolean;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    type: 'exact' | 'similar' | 'formatted';
  } {
    // Normalize phone numbers
    const normalizePhone = (phone: string) => phone.replace(/[\s\-\(\)\+]/g, '');
    const normalized1 = normalizePhone(phone1);
    const normalized2 = normalizePhone(phone2);

    // Exact match
    if (normalized1 === normalized2) {
      return { isMatch: true, score: 100, confidence: 'high', type: 'exact' };
    }

    // Check if one is a subset of the other (with country code)
    if (normalized1.endsWith(normalized2) || normalized2.endsWith(normalized1)) {
      return { isMatch: true, score: 85, confidence: 'high', type: 'formatted' };
    }

    // Similarity check
    const similarity = this.calculateStringSimilarity(normalized1, normalized2);
    if (similarity > 0.8) {
      return { isMatch: true, score: Math.floor(similarity * 80), confidence: 'medium', type: 'similar' };
    }

    return { isMatch: false, score: 0, confidence: 'low', type: 'exact' };
  }

  /**
   * Compare addresses with geolocation and similarity
   */
  private compareAddresses(address1: string, address2: string): {
    isMatch: boolean;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    distance?: number;
  } {
    const similarity = this.calculateStringSimilarity(address1.toLowerCase(), address2.toLowerCase());
    
    if (similarity > 0.9) {
      return { isMatch: true, score: 90, confidence: 'high' };
    } else if (similarity > 0.7) {
      return { isMatch: true, score: Math.floor(similarity * 70), confidence: 'medium' };
    } else if (similarity > 0.5) {
      return { isMatch: true, score: Math.floor(similarity * 50), confidence: 'low' };
    }

    return { isMatch: false, score: 0, confidence: 'low' };
  }

  /**
   * Compare documents using hash and content similarity
   */
  private async compareDocuments(docs1: any, docs2: any): Promise<{
    isMatch: boolean;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    duplicateFields: string[];
    hash?: string;
  }> {
    const duplicateFields: string[] = [];
    let totalScore = 0;
    let matchCount = 0;

    // Compare document hashes if available
    for (const docType of ['nidDocument', 'policeClearance', 'medicalCertificate']) {
      if (docs1[docType] && docs2[docType]) {
        const hash1 = this.generateDocumentHash(docs1[docType]);
        const hash2 = this.generateDocumentHash(docs2[docType]);
        
        if (hash1 === hash2) {
          duplicateFields.push(docType);
          totalScore += 100;
          matchCount++;
        }
      }
    }

    if (matchCount > 0) {
      const avgScore = totalScore / matchCount;
      return {
        isMatch: true,
        score: avgScore,
        confidence: avgScore > 80 ? 'high' : avgScore > 60 ? 'medium' : 'low',
        duplicateFields,
        hash: this.generateDocumentHash(JSON.stringify(docs1))
      };
    }

    return { isMatch: false, score: 0, confidence: 'low', duplicateFields: [] };
  }

  /**
   * Compare face biometrics (placeholder for actual face recognition)
   */
  private async compareFaceBiometrics(face1: string, face2: string): Promise<{
    isMatch: boolean;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    similarity: number;
  }> {
    // This would integrate with actual face recognition service
    // For now, we'll use a placeholder implementation
    const similarity = Math.random() * 0.3 + 0.7; // Simulate 70-100% similarity
    
    if (similarity > 0.95) {
      return { isMatch: true, score: 100, confidence: 'high', similarity };
    } else if (similarity > 0.85) {
      return { isMatch: true, score: Math.floor(similarity * 90), confidence: 'medium', similarity };
    }

    return { isMatch: false, score: 0, confidence: 'low', similarity: 0 };
  }

  /**
   * Compare fingerprint biometrics (placeholder for actual fingerprint matching)
   */
  private async compareFingerprintBiometrics(fingerprint1: string, fingerprint2: string): Promise<{
    isMatch: boolean;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    similarity: number;
  }> {
    // This would integrate with actual fingerprint matching service
    // For now, we'll use a placeholder implementation
    const similarity = Math.random() * 0.2 + 0.8; // Simulate 80-100% similarity
    
    if (similarity > 0.98) {
      return { isMatch: true, score: 100, confidence: 'high', similarity };
    } else if (similarity > 0.90) {
      return { isMatch: true, score: Math.floor(similarity * 95), confidence: 'medium', similarity };
    }

    return { isMatch: false, score: 0, confidence: 'low', similarity: 0 };
  }

  /**
   * Check cross-references with external databases
   */
  private async checkCrossReferences(app1: any, app2: any): Promise<{
    isMatch: boolean;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    duplicateFields: string[];
    source: string;
  }> {
    // This would integrate with external government databases
    // For now, we'll simulate cross-reference checking
    const duplicateFields: string[] = [];
    let score = 0;

    // Simulate checking against government employee database
    if (app1.employeeNumber && app2.employeeNumber && app1.employeeNumber === app2.employeeNumber) {
      duplicateFields.push('employeeNumber');
      score += 50;
    }

    // Simulate checking against NID database
    if (app1.nidNumber && app2.nidNumber && app1.nidNumber === app2.nidNumber) {
      duplicateFields.push('nidNumber');
      score += 50;
    }

    if (duplicateFields.length > 0) {
      return {
        isMatch: true,
        score,
        confidence: score > 80 ? 'high' : 'medium',
        duplicateFields,
        source: 'Government Employee Database'
      };
    }

    return { isMatch: false, score: 0, confidence: 'low', duplicateFields: [], source: '' };
  }

  /**
   * Generate document hash for comparison
   */
  private generateDocumentHash(document: string): string {
    return crypto.createHash('sha256').update(document).digest('hex');
  }

  /**
   * Advanced duplicate evaluation with risk assessment
   */
  private evaluateDuplicatesAdvanced(matches: DuplicateMatch[]): DuplicateCheckResult {
    if (matches.length === 0) {
      return {
        isDuplicate: false,
        matches: [],
        canProceed: true,
        overallRiskLevel: 'low',
        requiresManualReview: false,
        autoResolvable: true,
        statistics: {
          totalMatches: 0,
          criticalMatches: 0,
          highRiskMatches: 0,
          mediumRiskMatches: 0,
          lowRiskMatches: 0
        }
      };
    }

    // Sort matches by risk level and score
    matches.sort((a, b) => {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }
      return b.matchScore - a.matchScore;
    });

    // Calculate statistics
    const statistics = {
      totalMatches: matches.length,
      criticalMatches: matches.filter(m => m.riskLevel === 'critical').length,
      highRiskMatches: matches.filter(m => m.riskLevel === 'high').length,
      mediumRiskMatches: matches.filter(m => m.riskLevel === 'medium').length,
      lowRiskMatches: matches.filter(m => m.riskLevel === 'low').length
    };

    // Determine overall risk level
    let overallRiskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (statistics.criticalMatches > 0) {
      overallRiskLevel = 'critical';
    } else if (statistics.highRiskMatches > 0) {
      overallRiskLevel = 'high';
    } else if (statistics.mediumRiskMatches > 0) {
      overallRiskLevel = 'medium';
    }

    // Determine if manual review is required
    const requiresManualReview = statistics.criticalMatches > 0 || 
                                statistics.highRiskMatches > 1 || 
                                (statistics.highRiskMatches === 1 && statistics.mediumRiskMatches > 2);

    // Determine if auto-resolvable
    const autoResolvable = statistics.criticalMatches === 0 && 
                          statistics.highRiskMatches === 0 && 
                          statistics.mediumRiskMatches <= 1;

    // Determine if can proceed
    const canProceed = statistics.criticalMatches === 0;

    // Generate appropriate messages
    let warningMessage: string | undefined;
    let blockingMessage: string | undefined;

    if (!canProceed) {
      const criticalMatch = matches.find(m => m.riskLevel === 'critical');
      if (criticalMatch) {
        blockingMessage = this.generateBlockingMessage(criticalMatch);
      }
    } else if (requiresManualReview) {
      warningMessage = `Multiple potential duplicates detected. This application requires manual review by an administrator.`;
    } else if (matches.length > 0) {
      warningMessage = `Potential duplicate detected. Application will be processed with additional monitoring.`;
    }

    return {
      isDuplicate: matches.length > 0,
      matches,
      canProceed,
      warningMessage,
      blockingMessage,
      overallRiskLevel,
      requiresManualReview,
      autoResolvable,
      statistics
    };
  }

  /**
   * Generate blocking message for critical matches
   */
  private generateBlockingMessage(match: DuplicateMatch): string {
    switch (match.matchType) {
      case 'employee_number':
        return `Employee number ${match.existingApplication.employeeNumber} is already registered. Each employee number must be unique.`;
      case 'email':
        return `Work email ${match.existingApplication.workEmail} is already registered. Each email must be unique.`;
      case 'nid_hash':
        return `National ID number is already registered. Each NID must be unique.`;
      case 'biometric_face':
        return `Face biometric data matches existing application. Biometric data must be unique.`;
      case 'biometric_fingerprint':
        return `Fingerprint biometric data matches existing application. Biometric data must be unique.`;
      default:
        return `Critical duplicate detected with existing application ${match.applicationId}. Manual review required.`;
    }
  }

  /**
   * Legacy evaluation method for backward compatibility
   */
  private evaluateDuplicates(matches: DuplicateMatch[]): DuplicateCheckResult {
    if (matches.length === 0) {
      return { isDuplicate: false, matches: [], canProceed: true };
    }

    // Sort matches by score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    const highestMatch = matches[0];

    // BLOCKING scenarios
    if (highestMatch.matchType === 'employee_number') {
      return {
        isDuplicate: true,
        matches,
        canProceed: false,
        blockingMessage: `Employee number ${highestMatch.existingApplication.employeeNumber} is already registered. Each employee number must be unique.`
      };
    }

    if (highestMatch.matchType === 'email') {
      return {
        isDuplicate: true,
        matches,
        canProceed: false,
        blockingMessage: `Work email ${highestMatch.existingApplication.workEmail} is already registered. Each email must be unique.`
      };
    }

    // HIGH RISK scenarios - require admin review
    if (highestMatch.matchScore >= 70) {
      return {
        isDuplicate: true,
        matches,
        canProceed: false,
        blockingMessage: `High similarity match detected with existing application ${highestMatch.applicationId}. Admin review required.`
      };
    }

    // MEDIUM RISK scenarios - allow with warning
    if (highestMatch.matchScore >= 40) {
      return {
        isDuplicate: true,
        matches,
        canProceed: true,
        warningMessage: `Similar application found. Please verify this is not a duplicate submission.`
      };
    }

    // LOW RISK scenarios - log but allow
    return {
      isDuplicate: true,
      matches,
      canProceed: true,
      warningMessage: `Potential duplicate detected but application can proceed.`
    };
  }

  /**
   * Get detailed duplicate report for admin review with advanced analytics
   */
  async getDuplicateReport(applicationId: string): Promise<{
    application: any;
    potentialDuplicates: DuplicateMatch[];
    recommendations: string[];
    riskAnalysis: {
      overallRisk: 'critical' | 'high' | 'medium' | 'low';
      riskFactors: string[];
      mitigationStrategies: string[];
    };
    statistics: {
      totalMatches: number;
      criticalMatches: number;
      highRiskMatches: number;
      mediumRiskMatches: number;
      lowRiskMatches: number;
    };
    timeline: {
      firstDetected: string;
      lastUpdated: string;
      reviewHistory: any[];
    };
  }> {
    // This would be called by admins to review flagged duplicates
    const applicationPath = path.join(this.registryDir, `${applicationId}.json`);
    
    if (!existsSync(applicationPath)) {
      throw new Error('Application not found');
    }

    const applicationData = JSON.parse(await readFile(applicationPath, 'utf-8'));
    const duplicateResult = await this.checkForDuplicates(applicationData);
    
    const recommendations = this.generateAdvancedRecommendations(duplicateResult.matches);
    const riskAnalysis = this.performRiskAnalysis(duplicateResult);
    const timeline = this.generateTimeline(applicationData);

    return {
      application: applicationData,
      potentialDuplicates: duplicateResult.matches,
      recommendations,
      riskAnalysis,
      statistics: duplicateResult.statistics,
      timeline
    };
  }

  /**
   * Perform comprehensive risk analysis
   */
  private performRiskAnalysis(duplicateResult: DuplicateCheckResult): {
    overallRisk: 'critical' | 'high' | 'medium' | 'low';
    riskFactors: string[];
    mitigationStrategies: string[];
  } {
    const riskFactors: string[] = [];
    const mitigationStrategies: string[] = [];

    // Analyze risk factors
    if (duplicateResult.statistics.criticalMatches > 0) {
      riskFactors.push('Critical duplicate matches detected');
      mitigationStrategies.push('Immediate manual review required');
      mitigationStrategies.push('Contact applicant for verification');
    }

    if (duplicateResult.statistics.highRiskMatches > 1) {
      riskFactors.push('Multiple high-risk duplicate matches');
      mitigationStrategies.push('Enhanced verification process');
      mitigationStrategies.push('Cross-reference with external databases');
    }

    if (duplicateResult.requiresManualReview) {
      riskFactors.push('Manual review required');
      mitigationStrategies.push('Assign to senior administrator');
      mitigationStrategies.push('Document all verification steps');
    }

    if (duplicateResult.matches.some(m => m.matchType === 'biometric_face' || m.matchType === 'biometric_fingerprint')) {
      riskFactors.push('Biometric data conflicts detected');
      mitigationStrategies.push('Re-verify biometric data');
      mitigationStrategies.push('Check for data entry errors');
    }

    return {
      overallRisk: duplicateResult.overallRiskLevel,
      riskFactors,
      mitigationStrategies
    };
  }

  /**
   * Generate timeline for duplicate tracking
   */
  private generateTimeline(applicationData: any): {
    firstDetected: string;
    lastUpdated: string;
    reviewHistory: any[];
  } {
    return {
      firstDetected: applicationData.createdAt || new Date().toISOString(),
      lastUpdated: applicationData.updatedAt || new Date().toISOString(),
      reviewHistory: applicationData.duplicateCheck?.reviewHistory || []
    };
  }

  /**
   * Generate advanced recommendations for admin action
   */
  private generateAdvancedRecommendations(matches: DuplicateMatch[]): string[] {
    const recommendations: string[] = [];

    for (const match of matches) {
      switch (match.matchType) {
        case 'employee_number':
          recommendations.push(`🚨 CRITICAL: Employee number conflict detected. Verify if this is the same person or data entry error. Check HR records.`);
          break;
        case 'email':
          recommendations.push(`🚨 CRITICAL: Email conflict detected. Verify if shared email or same person. Check email ownership.`);
          break;
        case 'nid_hash':
          recommendations.push(`🚨 CRITICAL: National ID conflict detected. Verify identity documents. Check NID database.`);
          break;
        case 'biometric_face':
          recommendations.push(`⚠️ HIGH: Face biometric match detected. Re-verify face photo quality and check for data entry errors.`);
          break;
        case 'biometric_fingerprint':
          recommendations.push(`⚠️ HIGH: Fingerprint biometric match detected. Re-verify fingerprint data quality.`);
          break;
        case 'name_dob':
          recommendations.push(`⚠️ HIGH: Name and date of birth match. Likely same person - check if previous application should be updated.`);
          break;
        case 'phone_number':
          recommendations.push(`📞 MEDIUM: Phone number similarity detected. Verify phone number ownership and check for formatting differences.`);
          break;
        case 'address_geolocation':
          recommendations.push(`🏠 MEDIUM: Address similarity detected. Verify address details and check for same household.`);
          break;
        case 'document_similarity':
          recommendations.push(`📄 MEDIUM: Document similarity detected. Verify document authenticity and check for reused documents.`);
          break;
        case 'cross_reference':
          recommendations.push(`🔍 MEDIUM: Cross-reference match detected. Verify against external database records.`);
          break;
        default:
          recommendations.push(`ℹ️ MEDIUM: Partial match detected. Review details to confirm if duplicate.`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ No significant conflicts detected.');
    }

    // Add general recommendations
    if (matches.length > 0) {
      recommendations.push('📋 Document all verification steps in admin notes');
      recommendations.push('⏰ Set follow-up reminder for review completion');
      recommendations.push('📊 Update duplicate detection statistics');
    }

    return recommendations;
  }

  /**
   * Get duplicate detection analytics and trends
   */
  async getDuplicateAnalytics(): Promise<{
    summary: {
      totalApplications: number;
      duplicateApplications: number;
      duplicateRate: number;
      averageMatchesPerDuplicate: number;
    };
    trends: {
      dailyDuplicates: Array<{ date: string; count: number }>;
      weeklyTrends: Array<{ week: string; count: number }>;
      monthlyTrends: Array<{ month: string; count: number }>;
    };
    riskDistribution: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    matchTypeDistribution: Record<string, number>;
    resolutionStats: {
      resolved: number;
      pending: number;
      autoResolved: number;
      manualResolved: number;
    };
  }> {
    if (!existsSync(this.registryDir)) {
      return {
        summary: {
          totalApplications: 0,
          duplicateApplications: 0,
          duplicateRate: 0,
          averageMatchesPerDuplicate: 0
        },
        trends: {
          dailyDuplicates: [],
          weeklyTrends: [],
          monthlyTrends: []
        },
        riskDistribution: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        matchTypeDistribution: {},
        resolutionStats: {
          resolved: 0,
          pending: 0,
          autoResolved: 0,
          manualResolved: 0
        }
      };
    }

    const applicationFiles = readdirSync(this.registryDir);
    let totalApplications = 0;
    let duplicateApplications = 0;
    let totalMatches = 0;
    const riskDistribution = { critical: 0, high: 0, medium: 0, low: 0 };
    const matchTypeDistribution: Record<string, number> = {};
    const resolutionStats = { resolved: 0, pending: 0, autoResolved: 0, manualResolved: 0 };

    for (const filename of applicationFiles) {
      if (filename.endsWith('.json')) {
        try {
          const filePath = path.join(this.registryDir, filename);
          const applicationData = await readFile(filePath, 'utf-8');
          const application = JSON.parse(applicationData);
          
          totalApplications++;
          
          if (application.duplicateCheck?.hasWarning || application.duplicateCheck?.potentialMatches?.length > 0) {
            duplicateApplications++;
            const matches = application.duplicateCheck?.potentialMatches || [];
            totalMatches += matches.length;
            
            // Count risk levels
            matches.forEach((match: any) => {
              if (match.riskLevel) {
                riskDistribution[match.riskLevel as keyof typeof riskDistribution]++;
              }
              if (match.matchType) {
                matchTypeDistribution[match.matchType] = (matchTypeDistribution[match.matchType] || 0) + 1;
              }
            });
            
            // Count resolution status
            if (application.duplicateCheck?.resolved) {
              resolutionStats.resolved++;
              if (application.duplicateCheck?.resolution === 'auto') {
                resolutionStats.autoResolved++;
              } else {
                resolutionStats.manualResolved++;
              }
            } else {
              resolutionStats.pending++;
            }
          }
        } catch (error) {
          console.error(`Error reading application file ${filename}:`, error);
        }
      }
    }

    return {
      summary: {
        totalApplications,
        duplicateApplications,
        duplicateRate: totalApplications > 0 ? (duplicateApplications / totalApplications) * 100 : 0,
        averageMatchesPerDuplicate: duplicateApplications > 0 ? totalMatches / duplicateApplications : 0
      },
      trends: {
        dailyDuplicates: [], // Would be populated from historical data
        weeklyTrends: [], // Would be populated from historical data
        monthlyTrends: [] // Would be populated from historical data
      },
      riskDistribution,
      matchTypeDistribution,
      resolutionStats
    };
  }

  /**
   * Generate recommendations for admin action
   */
  private generateRecommendations(matches: DuplicateMatch[]): string[] {
    const recommendations: string[] = [];

    for (const match of matches) {
      if (match.matchType === 'employee_number') {
        recommendations.push(`CRITICAL: Employee number conflict detected. Investigate if this is the same person or data error.`);
      } else if (match.matchType === 'email') {
        recommendations.push(`CRITICAL: Email conflict detected. Verify if shared email or same person.`);
      } else if (match.matchType === 'name_dob') {
        recommendations.push(`HIGH: Name and date of birth match. Likely same person - check if previous application should be updated.`);
      } else {
        recommendations.push(`MEDIUM: Partial match detected. Review details to confirm if duplicate.`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('No significant conflicts detected.');
    }

    return recommendations;
  }
}