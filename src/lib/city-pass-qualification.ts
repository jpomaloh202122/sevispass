import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface UserQualificationData {
  userId: string;
  hasSevisPass: boolean;
  hasPublicServantPass: boolean;
  address: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface PublicServantApplication {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  workEmail: string;
  employeeNumber: string;
  department: string;
  address: string;
  createdAt: string;
}

export interface QualificationResult {
  isQualified: boolean;
  qualificationType: 'automatic' | 'manual' | 'not_qualified';
  qualificationReason: string;
  missingRequirements: string[];
  recommendedActions: string[];
  autoApprovalEligible: boolean;
}

export class CityPassQualificationService {
  
  /**
   * Port Moresby areas that qualify for city pass employee category
   */
  private static readonly PORT_MORESBY_AREAS = [
    // Central areas
    'downtown', 'town', 'central', 'cbd', 'business district',
    // Named suburbs/areas in Port Moresby
    'boroko', 'gordons', 'korobosea', 'spring garden', 'badili',
    'konedobu', 'ela beach', 'ward strip', 'hanuabada', 'gabutu',
    'newtown', 'sabama', 'june valley', 'tokarara', 'gerehu',
    'morata', '6-mile', '7-mile', '8-mile', '9-mile', 'saraga',
    'waigani', '14-mile', 'university', 'bomana', 'baruni',
    // Areas often written in addresses
    'port moresby', 'moresby', 'ncd', 'national capital district'
  ];

  /**
   * Check if a user qualifies for automatic city pass employee category
   */
  static async checkQualification(userData: UserQualificationData): Promise<QualificationResult> {
    const result: QualificationResult = {
      isQualified: false,
      qualificationType: 'not_qualified',
      qualificationReason: '',
      missingRequirements: [],
      recommendedActions: [],
      autoApprovalEligible: false
    };

    // Check SevisPass requirement
    if (!userData.hasSevisPass) {
      result.missingRequirements.push('SevisPass digital ID');
      result.recommendedActions.push('Complete your SevisPass registration and biometric verification');
    }

    // Check Public Servant Pass requirement
    const publicServantStatus = await this.checkPublicServantStatus(userData.userId);
    if (!publicServantStatus.hasApproved) {
      if (publicServantStatus.hasPending) {
        result.missingRequirements.push('Approved Public Servant Pass (application pending)');
        result.recommendedActions.push('Wait for your Public Servant Pass application to be approved');
      } else {
        result.missingRequirements.push('Public Servant Pass');
        result.recommendedActions.push('Apply for Public Servant Pass if you are a government employee');
      }
    }

    // Check Port Moresby address requirement
    const isInPortMoresby = this.isPortMoresbyAddress(userData.address);
    if (!isInPortMoresby) {
      result.missingRequirements.push('Address within Port Moresby city limits');
      result.recommendedActions.push('Your address must be within Port Moresby city to qualify for employee category');
    }

    // Determine qualification status
    if (result.missingRequirements.length === 0) {
      // Fully qualified for automatic approval
      result.isQualified = true;
      result.qualificationType = 'automatic';
      result.autoApprovalEligible = true;
      result.qualificationReason = 'You meet all requirements for automatic City Pass employee category approval: SevisPass holder, approved Public Servant Pass, and Port Moresby resident.';
    } else if (userData.hasSevisPass && result.missingRequirements.length <= 1) {
      // Partially qualified - can apply manually
      result.isQualified = true;
      result.qualificationType = 'manual';
      result.autoApprovalEligible = false;
      result.qualificationReason = `You are eligible to apply for City Pass employee category. Missing: ${result.missingRequirements.join(', ')}`;
    } else {
      // Not qualified
      result.isQualified = false;
      result.qualificationType = 'not_qualified';
      result.autoApprovalEligible = false;
      result.qualificationReason = `You do not meet the minimum requirements. Missing: ${result.missingRequirements.join(', ')}`;
    }

    return result;
  }

  /**
   * Check if user has an approved Public Servant Pass
   */
  private static async checkPublicServantStatus(userId: string): Promise<{
    hasApproved: boolean;
    hasPending: boolean;
    applicationId?: string;
  }> {
    try {
      // Import fs/promises dynamically to avoid issues
      const { readdir } = await import('fs/promises');
      
      // Check for existing public servant cards first
      const cardsDir = path.join(process.cwd(), 'data', 'public-servant-cards');
      
      if (existsSync(cardsDir)) {
        try {
          const cardFiles = await readdir(cardsDir);
          
          for (const cardFile of cardFiles) {
            if (cardFile.endsWith('.json')) {
              const cardPath = path.join(cardsDir, cardFile);
              const cardData = JSON.parse(await readFile(cardPath, 'utf-8'));
              
              if (cardData.userId === userId && cardData.isActive) {
                return { 
                  hasApproved: true, 
                  hasPending: false,
                  applicationId: cardData.applicationId 
                };
              }
            }
          }
        } catch (cardError) {
          console.warn('Error reading public servant cards:', cardError.message);
        }
      }

      // Check for applications
      const applicationsDir = path.join(process.cwd(), 'data', 'public-servant-id-applications');
      
      if (existsSync(applicationsDir)) {
        try {
          const appFiles = await readdir(applicationsDir);
          
          for (const appFile of appFiles) {
            if (appFile.endsWith('.json')) {
              const appPath = path.join(applicationsDir, appFile);
              const appData = JSON.parse(await readFile(appPath, 'utf-8'));
              
              if (appData.userId === userId) {
                if (appData.status === 'approved') {
                  return { 
                    hasApproved: true, 
                    hasPending: false,
                    applicationId: appData.id 
                  };
                } else if (appData.status === 'pending' || appData.status === 'under_review') {
                  return { 
                    hasApproved: false, 
                    hasPending: true,
                    applicationId: appData.id 
                  };
                }
              }
            }
          }
        } catch (appError) {
          console.warn('Error reading public servant applications:', appError.message);
        }
      }

      return { hasApproved: false, hasPending: false };
    } catch (error) {
      console.error('Error checking public servant status:', error);
      return { hasApproved: false, hasPending: false };
    }
  }

  /**
   * Check if address is within Port Moresby city limits
   */
  private static isPortMoresbyAddress(address: string): boolean {
    if (!address) return false;

    const normalizedAddress = address.toLowerCase().trim();
    
    return this.PORT_MORESBY_AREAS.some(area => 
      normalizedAddress.includes(area.toLowerCase())
    );
  }

  /**
   * Get detailed qualification report for a user
   */
  static async getQualificationReport(userId: string): Promise<{
    qualification: QualificationResult;
    userDetails: {
      hasSevisPass: boolean;
      publicServantStatus: any;
      addressInfo: {
        address: string;
        isPortMoresby: boolean;
        detectedAreas: string[];
      };
    };
  }> {
    try {
      // Get user data from database (you'll need to implement this based on your DB structure)
      const userData = await this.getUserData(userId);
      
      if (!userData) {
        throw new Error('User not found');
      }

      const publicServantStatus = await this.checkPublicServantStatus(userId);
      const addressInfo = this.getAddressInfo(userData.address);
      
      const qualificationData: UserQualificationData = {
        userId,
        hasSevisPass: true, // Assume true if they can access the system
        hasPublicServantPass: publicServantStatus.hasApproved,
        address: userData.address || '',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: userData.createdAt
      };

      const qualification = await this.checkQualification(qualificationData);

      return {
        qualification,
        userDetails: {
          hasSevisPass: qualificationData.hasSevisPass,
          publicServantStatus,
          addressInfo
        }
      };
    } catch (error) {
      console.error('Error getting qualification report:', error);
      throw error;
    }
  }

  /**
   * Get user data with wallet integration
   */
  private static async getUserData(userId: string): Promise<any> {
    try {
      // Try to get data from wallet cards first
      const { WalletCardService } = await import('./wallet-card-service');
      const walletCheck = await WalletCardService.checkUserCards(userId);
      
      if (walletCheck.autoPopulatedFields) {
        return {
          userId,
          email: walletCheck.autoPopulatedFields.email || 'user@example.com',
          firstName: walletCheck.autoPopulatedFields.firstName || 'John',
          lastName: walletCheck.autoPopulatedFields.lastName || 'Doe',
          address: walletCheck.autoPopulatedFields.address || 'Port Moresby, NCD',
          createdAt: new Date().toISOString(),
          hasWalletData: true,
          walletSources: {
            sevisPass: !!walletCheck.sevisPassCard,
            publicServant: !!walletCheck.publicServantCard
          }
        };
      }
    } catch (error) {
      // Could not load wallet data, using fallback
    }
    
    // Fallback to mock data
    return {
      userId,
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      address: 'Downtown Port Moresby, NCD',
      createdAt: new Date().toISOString(),
      hasWalletData: false
    };
  }

  /**
   * Get detailed address information
   */
  private static getAddressInfo(address: string): {
    address: string;
    isPortMoresby: boolean;
    detectedAreas: string[];
  } {
    const detectedAreas: string[] = [];
    const normalizedAddress = address?.toLowerCase() || '';
    
    this.PORT_MORESBY_AREAS.forEach(area => {
      if (normalizedAddress.includes(area.toLowerCase())) {
        detectedAreas.push(area);
      }
    });

    return {
      address: address || '',
      isPortMoresby: detectedAreas.length > 0,
      detectedAreas
    };
  }

  /**
   * Auto-approve city pass for qualified users
   */
  static async autoApproveCityPass(userId: string): Promise<{
    success: boolean;
    cityPassId?: string;
    message: string;
  }> {
    try {
      const report = await this.getQualificationReport(userId);
      
      if (!report.qualification.autoApprovalEligible) {
        return {
          success: false,
          message: 'User does not qualify for automatic approval'
        };
      }

      // Generate city pass
      const cityPassId = `CPAE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const now = new Date();
      const expiryDate = new Date();
      expiryDate.setFullYear(now.getFullYear() + 1); // 1 year validity

      const cityPass = {
        id: cityPassId,
        userId,
        category: 'employee',
        status: 'approved',
        autoApproved: true,
        qualificationBasis: 'SevisPass + Public Servant + Port Moresby Address',
        issueDate: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        validityPeriod: 12,
        ncdcReference: `NCDC-${cityPassId}`,
        createdAt: now.toISOString()
      };

      // Save the auto-approved city pass
      const cityPassDir = path.join(process.cwd(), 'data', 'city-pass-auto-approved');
      const { mkdir, writeFile } = require('fs/promises');
      
      if (!existsSync(cityPassDir)) {
        await mkdir(cityPassDir, { recursive: true });
      }

      const passPath = path.join(cityPassDir, `${cityPassId}.json`);
      await writeFile(passPath, JSON.stringify(cityPass, null, 2));

      return {
        success: true,
        cityPassId,
        message: 'City Pass employee category automatically approved and issued'
      };

    } catch (error) {
      console.error('Error auto-approving city pass:', error);
      return {
        success: false,
        message: 'Failed to auto-approve city pass'
      };
    }
  }
}