import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface SevisPassCard {
  id: string;
  type: 'sevispass';
  holderName: string;
  firstName: string;
  lastName: string;
  email: string;
  nid: string;
  phoneNumber: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  cardNumber: string;
  issueDate: string;
  expiryDate?: string;
  isVerified: boolean;
}

export interface WalletCardCheck {
  hasSevisPass: boolean;
  sevisPassCard?: SevisPassCard;
  autoPopulatedFields?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    identificationNumber?: string;
    identificationType?: 'national_id' | 'passport' | 'drivers_license';
  };
}

export class WalletCardService {
  
  /**
   * Check user's wallet for SevisPass cards
   */
  static async checkUserCards(userId: string): Promise<WalletCardCheck> {
    const result: WalletCardCheck = {
      hasSevisPass: false
    };

    try {
      // Check for SevisPass (assume user has it if they can access the system)
      const sevisPassData = await this.getSevisPassFromUser(userId);
      if (sevisPassData) {
        result.hasSevisPass = true;
        result.sevisPassCard = sevisPassData;
      }

      // Auto-populate fields based on available cards
      result.autoPopulatedFields = this.generateAutoPopulatedFields(
        result.sevisPassCard
      );

      return result;
    } catch (error) {
      console.error('Error checking user cards:', error);
      return result;
    }
  }

  /**
   * Get SevisPass card data (simulated from user database)
   */
  private static async getSevisPassFromUser(userId: string): Promise<SevisPassCard | null> {
    try {
      // In a real implementation, you would fetch this from your users database
      // For now, we'll simulate it based on the assumption that logged-in users have SevisPass
      
      // Try to get user data from the database or user session
      // This is a simplified version - in production, integrate with your user service
      
      return {
        id: `sevis-${userId}`,
        type: 'sevispass',
        holderName: 'User Name', // Would come from user database
        firstName: 'John', // Would come from user database
        lastName: 'Doe', // Would come from user database
        email: 'user@example.com', // Would come from user database
        nid: '1234567890', // Would come from user database
        phoneNumber: '+675 123 4567', // Would come from user database
        address: 'Port Moresby, NCD', // Would come from user database
        dateOfBirth: '1990-01-01', // Would come from user database
        gender: 'male', // Would come from user database
        cardNumber: `SP${Date.now()}`,
        issueDate: new Date().toISOString(),
        isVerified: true
      };
    } catch (error) {
      console.warn('Could not get SevisPass data:', error);
      return null;
    }
  }

  /**
   * Generate auto-populated fields based on available cards
   */
  private static generateAutoPopulatedFields(
    sevisPass?: SevisPassCard
  ): WalletCardCheck['autoPopulatedFields'] {
    const fields: WalletCardCheck['autoPopulatedFields'] = {};

    // Use SevisPass data for personal information
    if (sevisPass) {
      fields.firstName = sevisPass.firstName;
      fields.lastName = sevisPass.lastName;
      fields.email = sevisPass.email;
      fields.phone = sevisPass.phoneNumber;
      fields.dateOfBirth = sevisPass.dateOfBirth;
      fields.gender = sevisPass.gender;
      fields.identificationNumber = sevisPass.nid;
      fields.identificationType = 'national_id';
      fields.nationality = 'Papua New Guinean';
      
      // Use SevisPass address if available
      if (sevisPass.address) {
        fields.address = sevisPass.address;
      }
    }

    return fields;
  }

  /**
   * Check if address qualifies for Port Moresby resident category
   */
  static isPortMoresbyAddress(address: string): boolean {
    if (!address) return false;

    const portMoresbyAreas = [
      // General identifiers
      'port moresby', 'ncd', 'national capital district',
      'downtown', 'town', 'central', 'cbd', 'business district',
      
      // Suburbs and areas
      'boroko', 'gordons', 'korobosea', 'spring garden', 'badili',
      'konedobu', 'ela beach', 'ward strip', 'hanuabada', 'gabutu',
      'newtown', 'sabama', 'june valley', 'tokarara', 'gerehu',
      'morata', '6-mile', '7-mile', '8-mile', '9-mile', 'saraga',
      'waigani', '14-mile', 'university', 'bomana', 'baruni',
      
      // Government areas and landmarks
      'tisa haus', 'islander drive', 'government haus', 'parliament haus',
      'murray barracks', 'jackson airport', 'port moresby harbour',
      'vision city', 'grand papua hotel', 'holiday inn', 'crown plaza',
      'airways hotel', 'lamana hotel', 'ela beach hotel',
      
      // Educational institutions
      'upng', 'university of papua new guinea', 'pom tech', 'don bosco',
      'international education agency',
      
      // Business districts and centers
      'town center', 'harbour city', 'vision city mall', 'rangeview plaza',
      'boroko motors', 'gordons market', 'koki market',
      
      // Government departments (common in addresses)
      'government buildings', 'vulupindi haus', 'namba wan plaza',
      'deloitte tower', 'credit corporation haus'
    ];

    const normalizedAddress = address.toLowerCase().trim();
    return portMoresbyAreas.some(area => normalizedAddress.includes(area));
  }

  /**
   * Generate comprehensive qualification report with wallet data
   */
  static async getWalletBasedQualificationReport(userId: string): Promise<{
    walletCheck: WalletCardCheck;
    qualification: {
      isQualified: boolean;
      autoApprovalEligible: boolean;
      qualificationType: 'automatic' | 'manual' | 'not_qualified';
      qualificationReason: string;
      missingRequirements: string[];
      recommendedActions: string[];
    };
    autoPopulatedForm: {[key: string]: string | number | boolean};
  }> {
    const walletCheck = await this.checkUserCards(userId);
    
    const qualification = {
      isQualified: false,
      autoApprovalEligible: false,
      qualificationType: 'not_qualified' as 'automatic' | 'manual' | 'not_qualified',
      qualificationReason: '',
      missingRequirements: [] as string[],
      recommendedActions: [] as string[]
    };

    // Check qualification based on wallet cards
    if (!walletCheck.hasSevisPass) {
      qualification.missingRequirements.push('SevisPass digital ID');
      qualification.recommendedActions.push('Complete your SevisPass registration and biometric verification');
    }

    const addressQualifies = walletCheck.autoPopulatedFields?.address ? 
      this.isPortMoresbyAddress(walletCheck.autoPopulatedFields.address) : false;

    if (!addressQualifies) {
      qualification.missingRequirements.push('Address within Port Moresby city limits');
      qualification.recommendedActions.push('Your address must be within Port Moresby city to qualify for resident category');
    }

    // Determine qualification level
    if (qualification.missingRequirements.length === 0) {
      qualification.isQualified = true;
      qualification.autoApprovalEligible = true;
      qualification.qualificationType = 'automatic';
      qualification.qualificationReason = 'You meet all requirements for automatic City Pass approval: SevisPass holder and Port Moresby resident.';
    } else if (walletCheck.hasSevisPass && qualification.missingRequirements.length <= 1) {
      qualification.isQualified = true;
      qualification.autoApprovalEligible = false;
      qualification.qualificationType = 'manual';
      qualification.qualificationReason = `You are eligible to apply for City Pass. Missing: ${qualification.missingRequirements.join(', ')}`;
    } else {
      qualification.isQualified = false;
      qualification.autoApprovalEligible = false;
      qualification.qualificationType = 'not_qualified';
      qualification.qualificationReason = `You do not meet the minimum requirements. Missing: ${qualification.missingRequirements.join(', ')}`;
    }

    // Generate auto-populated form data
    const autoPopulatedForm = {
      category: 'resident',
      ...walletCheck.autoPopulatedFields,
      categorySpecificData: {
        sevisPassCardId: walletCheck.sevisPassCard?.id
      }
    };

    return {
      walletCheck,
      qualification,
      autoPopulatedForm
    };
  }
}