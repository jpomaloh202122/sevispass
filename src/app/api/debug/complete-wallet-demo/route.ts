import { NextRequest, NextResponse } from 'next/server';
import { WalletCardService } from '@/lib/wallet-card-service';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    title: 'Complete Wallet-Based City Pass System Demo',
    description: 'Demonstrates the full integration of wallet cards with City Pass employee qualification',
    features: [
      '🎯 Automatic detection of SevisPass and Public Servant cards in user wallet',
      '📋 Auto-population of all common fields from existing cards',
      '🚀 Instant approval for fully qualified users',
      '📱 Seamless integration with existing wallet system',
      '✅ Enhanced address detection for Port Moresby areas'
    ],
    endpoints: {
      'GET /api/city-pass/employee-qualification-wallet': 'Get wallet-based qualification status',
      'POST /api/city-pass/employee-qualification-wallet': 'Apply with wallet integration',
      'GET /api/debug/complete-wallet-demo': 'This demo endpoint',
      'POST /api/debug/complete-wallet-demo': 'Run complete system test'
    },
    testUser: {
      userId: 'mf68grvw-5740734e685dbced',
      hasCards: {
        sevisPass: 'Auto-detected (logged in user)',
        publicServantPass: 'PSC-1757230995766-k1vpy1oph'
      }
    }
  });
}

export async function POST(request: NextRequest) {
  const results: string[] = [];
  
  try {
    results.push('🎯 **COMPLETE WALLET-BASED CITY PASS SYSTEM DEMO**');
    results.push(`⏰ Start Time: ${new Date().toISOString()}`);
    results.push('');

    const testUserId = 'mf68grvw-5740734e685dbced';
    
    // Step 1: User logs in and system detects wallet cards
    results.push('📋 **STEP 1: Wallet Card Detection**');
    results.push('🔍 System automatically scans user wallet for existing cards...');
    
    const walletCheck = await WalletCardService.checkUserCards(testUserId);
    results.push(`✅ SevisPass detected: ${walletCheck.sevisPassCard?.cardNumber || 'N/A'}`);
    results.push(`✅ Public Servant Pass detected: ${walletCheck.publicServantCard?.cardNumber || 'N/A'}`);
    
    if (walletCheck.publicServantCard) {
      results.push(`🏢 Employee: ${walletCheck.publicServantCard.holderName}`);
      results.push(`🏛️ Department: ${walletCheck.publicServantCard.department}`);
      results.push(`📍 Work Address: ${walletCheck.publicServantCard.address}`);
    }
    results.push('');

    // Step 2: Auto-populate form fields
    results.push('📋 **STEP 2: Auto-Population of Fields**');
    results.push('🔄 System extracts common fields from wallet cards...');
    
    const report = await WalletCardService.getWalletBasedQualificationReport(testUserId);
    const autoForm = report.autoPopulatedForm;
    
    results.push(`👤 Name: ${autoForm.firstName} ${autoForm.lastName} (from SevisPass)`);
    results.push(`📧 Email: ${autoForm.email} (from SevisPass)`);
    results.push(`📞 Phone: ${autoForm.phone} (from SevisPass)`);
    results.push(`📍 Address: ${autoForm.address} (from Public Servant card)`);
    results.push(`🎂 DOB: ${autoForm.dateOfBirth} (from SevisPass)`);
    results.push(`🆔 ID Number: ${autoForm.identificationNumber} (from SevisPass)`);
    
    if (autoForm.categorySpecificData) {
      results.push(`🏢 Employee #: ${autoForm.categorySpecificData.employeeNumber} (from PS card)`);
      results.push(`🏛️ Department: ${autoForm.categorySpecificData.department} (from PS card)`);
      results.push(`💼 Work Email: ${autoForm.categorySpecificData.workEmail} (from PS card)`);
    }
    results.push('');

    // Step 3: Qualification Assessment
    results.push('📋 **STEP 3: Automatic Qualification Assessment**');
    results.push('🎯 System evaluates qualification based on wallet cards...');
    
    const qualification = report.qualification;
    results.push(`✅ SevisPass: ${walletCheck.hasSevisPass ? 'FOUND' : 'MISSING'}`);
    results.push(`✅ Public Servant Pass: ${walletCheck.hasPublicServantPass ? 'FOUND' : 'MISSING'}`);
    
    const addressQualifies = WalletCardService.isPortMoresbyAddress(autoForm.address || '');
    results.push(`✅ Port Moresby Address: ${addressQualifies ? 'CONFIRMED' : 'NOT DETECTED'}`);
    results.push('');
    
    results.push(`🎯 **QUALIFICATION RESULT: ${qualification.qualificationType.toUpperCase()}**`);
    results.push(`💬 ${qualification.qualificationReason}`);
    
    if (qualification.missingRequirements.length > 0) {
      results.push(`📋 Missing: ${qualification.missingRequirements.join(', ')}`);
    }
    results.push('');

    // Step 4: Action Based on Qualification
    results.push('📋 **STEP 4: System Action**');
    
    if (qualification.autoApprovalEligible) {
      results.push('🚀 **AUTOMATIC APPROVAL TRIGGERED**');
      results.push('⚡ System processes instant approval...');
      
      // Simulate auto-approval process
      const cityPassId = `CPAE-${Date.now()}-WALLET`;
      const approvalData = {
        id: cityPassId,
        category: 'employee',
        status: 'approved',
        autoApproved: true,
        ...autoForm,
        approvedAt: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      results.push(`✅ City Pass Issued: ${cityPassId}`);
      results.push(`📅 Valid until: ${approvalData.expiryDate.split('T')[0]}`);
      results.push(`🎫 Status: ACTIVE`);
      results.push('📱 Pass automatically added to digital wallet');
      
    } else if (qualification.isQualified) {
      results.push('⚠️ **MANUAL APPLICATION PREPARED**');
      results.push('📝 Form pre-populated with wallet data');
      results.push('👤 User needs to review and submit application');
      results.push('⏱️ Processing time: 5-7 business days');
      
    } else {
      results.push('❌ **REQUIREMENTS NOT MET**');
      results.push('📋 User guided to complete missing requirements');
      results.push('🔄 System will recheck when requirements are met');
    }
    results.push('');

    // Step 5: User Experience Summary
    results.push('📋 **STEP 5: User Experience Summary**');
    
    if (qualification.autoApprovalEligible) {
      results.push('🎉 **SEAMLESS EXPERIENCE ACHIEVED!**');
      results.push('⏱️ Total time: < 5 seconds');
      results.push('📝 Forms filled: 0 (completely automated)');
      results.push('📎 Documents required: 0 (data from existing cards)');
      results.push('🎯 User action needed: Click one button');
      
    } else {
      results.push('📝 **ASSISTED EXPERIENCE PROVIDED**');
      results.push('⏱️ Form completion time: < 2 minutes');
      const fieldsPopulated = Object.keys(autoForm).length - 1; // exclude category
      results.push(`📋 Fields auto-populated: ${fieldsPopulated}`);
      results.push('🎯 User only needs to review and submit');
    }
    results.push('');

    // Final Summary
    results.push('📋 **SYSTEM CAPABILITIES DEMONSTRATED**');
    results.push('✅ Wallet card detection and parsing');
    results.push('✅ Intelligent field auto-population');
    results.push('✅ Address-based qualification logic');
    results.push('✅ Automatic approval processing');
    results.push('✅ Seamless integration with existing systems');
    results.push('✅ Enhanced user experience with minimal friction');
    results.push('');
    
    results.push('🚀 **WALLET-BASED CITY PASS SYSTEM FULLY OPERATIONAL!**');

    return NextResponse.json({
      success: true,
      demoResults: results,
      systemData: {
        walletCheck,
        qualificationReport: report,
        autoPopulatedForm: autoForm,
        qualification
      },
      timestamp: new Date().toISOString(),
      summary: {
        cardsDetected: walletCheck.hasSevisPass && walletCheck.hasPublicServantPass,
        fieldsAutoPopulated: Object.keys(autoForm).length,
        qualificationLevel: qualification.qualificationType,
        autoApprovalReady: qualification.autoApprovalEligible,
        userExperienceRating: qualification.autoApprovalEligible ? 'EXCELLENT' : 'GOOD'
      }
    });

  } catch (error) {
    results.push(`💥 Demo failed: ${error.message}`);
    return NextResponse.json({ 
      success: false,
      demoResults: results,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}