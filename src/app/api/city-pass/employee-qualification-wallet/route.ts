import { NextRequest, NextResponse } from 'next/server';
import { WalletCardService } from '@/lib/wallet-card-service';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-jwt-secret-key-2024';

function verifyUserToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * GET - Check wallet-based qualification and get auto-populated form data
 */
export async function GET(request: NextRequest) {
  try {
    const userData = verifyUserToken(request);
    
    // Get comprehensive wallet-based qualification report
    const report = await WalletCardService.getWalletBasedQualificationReport(userData.uid);
    
    return NextResponse.json({
      success: true,
      ...report,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Error checking wallet-based qualification

    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to check wallet-based qualification' },
      { status: 500 }
    );
  }
}

/**
 * POST - Apply for city pass with auto-populated data or request auto-approval
 */
export async function POST(request: NextRequest) {
  try {
    const userData = verifyUserToken(request);
    const { action, formData } = await request.json();
    
    const report = await WalletCardService.getWalletBasedQualificationReport(userData.uid);
    
    if (action === 'get_auto_populated_form') {
      // Return auto-populated form data
      return NextResponse.json({
        success: true,
        autoPopulatedForm: report.autoPopulatedForm,
        walletCards: {
          sevisPass: report.walletCheck.sevisPassCard,
          publicServant: report.walletCheck.publicServantCard
        },
        qualification: report.qualification,
        recommendations: getRecommendations(report.qualification, report.walletCheck)
      });
    }
    
    else if (action === 'auto_approve') {
      if (!report.qualification.autoApprovalEligible) {
        return NextResponse.json({
          success: false,
          message: 'Not eligible for automatic approval',
          missingRequirements: report.qualification.missingRequirements,
          canApplyManually: report.qualification.isQualified
        }, { status: 400 });
      }

      // Process automatic approval
      const cityPassId = `CPAE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const now = new Date();
      const expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

      const autoApprovedPass = {
        id: cityPassId,
        userId: userData.uid,
        category: 'employee',
        status: 'approved',
        autoApproved: true,
        approvedAt: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        
        // Auto-populated from wallet
        firstName: report.autoPopulatedForm.firstName,
        lastName: report.autoPopulatedForm.lastName,
        email: report.autoPopulatedForm.email,
        phone: report.autoPopulatedForm.phone,
        address: report.autoPopulatedForm.address,
        dateOfBirth: report.autoPopulatedForm.dateOfBirth,
        gender: report.autoPopulatedForm.gender,
        nationality: report.autoPopulatedForm.nationality,
        identificationNumber: report.autoPopulatedForm.identificationNumber,
        identificationType: report.autoPopulatedForm.identificationType,
        
        // Employee-specific data
        employeeNumber: report.autoPopulatedForm.categorySpecificData.employeeNumber,
        department: report.autoPopulatedForm.categorySpecificData.department,
        workEmail: report.autoPopulatedForm.categorySpecificData.workEmail,
        
        // Wallet references
        walletSources: {
          sevisPassId: report.autoPopulatedForm.categorySpecificData.sevisPassCardId,
          publicServantId: report.autoPopulatedForm.categorySpecificData.publicServantCardId
        },
        
        validityPeriod: 12,
        ncdcReference: `NCDC-${cityPassId}`,
        applicationDate: now.toISOString(),
        approvalDate: now.toISOString(),
        reviewDate: now.toISOString()
      };

      // Save auto-approved city pass
      try {
        const { mkdir, writeFile } = await import('fs/promises');
        const { existsSync } = await import('fs');
        const path = await import('path');
        
        const passDir = path.join(process.cwd(), 'data', 'city-pass-applications');
        
        if (!existsSync(passDir)) {
          await mkdir(passDir, { recursive: true });
        }

        const passPath = path.join(passDir, `${cityPassId}.json`);
        await writeFile(passPath, JSON.stringify(autoApprovedPass, null, 2));

        return NextResponse.json({
          success: true,
          message: 'City Pass employee category automatically approved and issued',
          cityPassId,
          cityPass: autoApprovedPass,
          walletIntegration: {
            dataSourcedFrom: {
              sevisPass: !!report.walletCheck.sevisPassCard,
              publicServantPass: !!report.walletCheck.publicServantCard
            },
            autoPopulatedFields: Object.keys(report.autoPopulatedForm).length
          },
          nextSteps: [
            'Your City Pass is now active and available in your digital wallet',
            'Data was automatically populated from your existing SevisPass and Public Servant cards',
            'You can immediately access city employee benefits and services',
            'Present your digital pass for verification when needed'
          ]
        });

      } catch (saveError) {
        console.error('Error saving auto-approved city pass:', saveError);
        return NextResponse.json({
          success: false,
          message: 'Approval processed but failed to save. Please contact support.'
        }, { status: 500 });
      }
    }
    
    else if (action === 'submit_manual_application') {
      // Process manual application with pre-populated data
      const applicationData = {
        ...report.autoPopulatedForm,
        ...formData, // Override with any user-provided data
        walletAssisted: true,
        dataSourcedFrom: {
          sevisPass: !!report.walletCheck.sevisPassCard,
          publicServantPass: !!report.walletCheck.publicServantCard
        }
      };

      // You would then call the regular city pass application API
      // For now, return the prepared application data
      return NextResponse.json({
        success: true,
        message: 'Manual application data prepared',
        applicationData,
        note: 'This would be submitted to the regular city pass application endpoint'
      });
    }
    
    else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use: get_auto_populated_form, auto_approve, or submit_manual_application'
      }, { status: 400 });
    }

  } catch (error) {
    // Error processing wallet-based city pass application

    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process application' },
      { status: 500 }
    );
  }
}

function getRecommendations(qualification: any, walletCheck: any): string[] {
  const recommendations: string[] = [];

  if (qualification.autoApprovalEligible) {
    recommendations.push('✅ All requirements met - you can get instant approval!');
    recommendations.push('🎯 Click "Get Automatic Approval" to receive your City Pass immediately');
    recommendations.push('📱 Your data has been auto-populated from your existing cards');
  } else if (qualification.isQualified) {
    recommendations.push('⚠️ You can apply manually for City Pass employee category');
    recommendations.push('📋 Some fields will be auto-populated from your wallet cards');
    
    if (!walletCheck.hasPublicServantPass) {
      recommendations.push('🏢 Complete your Public Servant Pass application first for automatic approval');
    }
    
    if (walletCheck.autoPopulatedFields?.address && 
        !WalletCardService.isPortMoresbyAddress(walletCheck.autoPopulatedFields.address)) {
      recommendations.push('📍 Update your address to Port Moresby for automatic approval');
    }
  } else {
    recommendations.push('❌ Complete missing requirements first');
    
    if (!walletCheck.hasSevisPass) {
      recommendations.push('🆔 Register for SevisPass and complete biometric verification');
    }
    
    if (!walletCheck.hasPublicServantPass) {
      recommendations.push('🏢 Apply for Public Servant Pass if you are a government employee');
    }
    
    recommendations.push('📍 Ensure your address is within Port Moresby city limits');
  }

  return recommendations;
}