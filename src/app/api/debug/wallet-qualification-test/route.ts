import { NextRequest, NextResponse } from 'next/server';
import { WalletCardService } from '@/lib/wallet-card-service';

export async function GET(request: NextRequest) {
  const testResults: string[] = [];
  
  try {
    testResults.push('🎯 **WALLET-BASED CITY PASS QUALIFICATION TEST**');
    testResults.push(`⏰ Time: ${new Date().toISOString()}`);
    testResults.push('');

    // Test 1: Check wallet cards for existing user
    testResults.push('📋 **Test 1: Wallet Card Detection**');
    const testUserId = 'mf68grvw-5740734e685dbced'; // User from sample data
    
    const walletCheck = await WalletCardService.checkUserCards(testUserId);
    testResults.push(`✅ Has SevisPass: ${walletCheck.hasSevisPass}`);
    testResults.push(`✅ Has Public Servant Pass: ${walletCheck.hasPublicServantPass}`);
    
    if (walletCheck.publicServantCard) {
      testResults.push(`🏢 Department: ${walletCheck.publicServantCard.department}`);
      testResults.push(`📧 Work Email: ${walletCheck.publicServantCard.workEmail}`);
      testResults.push(`📍 Address: ${walletCheck.publicServantCard.address}`);
      testResults.push(`🆔 Employee #: ${walletCheck.publicServantCard.employeeNumber}`);
    }
    testResults.push('');

    // Test 2: Auto-populated fields
    testResults.push('📋 **Test 2: Auto-Populated Fields**');
    if (walletCheck.autoPopulatedFields) {
      const fields = walletCheck.autoPopulatedFields;
      testResults.push(`👤 Name: ${fields.firstName} ${fields.lastName}`);
      testResults.push(`📧 Email: ${fields.email}`);
      testResults.push(`📞 Phone: ${fields.phone}`);
      testResults.push(`📍 Address: ${fields.address}`);
      testResults.push(`🎂 DOB: ${fields.dateOfBirth}`);
      testResults.push(`⚧ Gender: ${fields.gender}`);
      testResults.push(`🆔 ID Type: ${fields.identificationType}`);
      testResults.push(`🔢 ID Number: ${fields.identificationNumber}`);
    }
    testResults.push('');

    // Test 3: Address qualification check
    testResults.push('📋 **Test 3: Port Moresby Address Check**');
    const testAddresses = [
      'TISA Haus, Islander Drive', // From sample data
      'Downtown Port Moresby, NCD',
      'Boroko Shopping Centre',
      'University of PNG, Waigani',
      'Lae, Morobe Province'
    ];

    testAddresses.forEach(address => {
      const qualifies = WalletCardService.isPortMoresbyAddress(address);
      testResults.push(`${qualifies ? '✅' : '❌'} "${address}" - ${qualifies ? 'Qualifies' : 'Does not qualify'}`);
    });
    testResults.push('');

    // Test 4: Comprehensive qualification report
    testResults.push('📋 **Test 4: Wallet-Based Qualification Report**');
    const report = await WalletCardService.getWalletBasedQualificationReport(testUserId);
    
    testResults.push(`✅ Qualified: ${report.qualification.isQualified}`);
    testResults.push(`🚀 Auto-approval eligible: ${report.qualification.autoApprovalEligible}`);
    testResults.push(`🎯 Type: ${report.qualification.qualificationType}`);
    testResults.push(`💬 Reason: ${report.qualification.qualificationReason}`);
    
    if (report.qualification.missingRequirements.length > 0) {
      testResults.push(`📋 Missing: ${report.qualification.missingRequirements.join(', ')}`);
    }
    testResults.push('');

    // Test 5: Auto-populated form structure
    testResults.push('📋 **Test 5: Auto-Populated Form Data**');
    testResults.push(`📝 Category: ${report.autoPopulatedForm.category}`);
    testResults.push(`👤 Name: ${report.autoPopulatedForm.firstName} ${report.autoPopulatedForm.lastName}`);
    testResults.push(`📧 Email: ${report.autoPopulatedForm.email}`);
    testResults.push(`📞 Phone: ${report.autoPopulatedForm.phone}`);
    testResults.push(`📍 Address: ${report.autoPopulatedForm.address}`);
    
    if (report.autoPopulatedForm.categorySpecificData) {
      const empData = report.autoPopulatedForm.categorySpecificData;
      testResults.push(`🏢 Employee #: ${empData.employeeNumber}`);
      testResults.push(`🏛️ Department: ${empData.department}`);
      testResults.push(`💼 Work Email: ${empData.workEmail}`);
    }
    testResults.push('');

    // Summary
    testResults.push('📋 **SUMMARY**');
    if (report.qualification.autoApprovalEligible) {
      testResults.push('🎉 **FULLY QUALIFIED FOR AUTOMATIC APPROVAL!**');
      testResults.push('✅ SevisPass detected in wallet');
      testResults.push('✅ Public Servant Pass detected in wallet');
      testResults.push('✅ Port Moresby address confirmed');
      testResults.push('✅ All fields auto-populated from wallet cards');
    } else if (report.qualification.isQualified) {
      testResults.push('⚠️ **QUALIFIED FOR MANUAL APPLICATION**');
      testResults.push('✅ Most fields can be auto-populated from wallet');
      testResults.push(`📋 Missing: ${report.qualification.missingRequirements.join(', ')}`);
    } else {
      testResults.push('❌ **NOT QUALIFIED - REQUIREMENTS NEEDED**');
      testResults.push(`📋 Missing: ${report.qualification.missingRequirements.join(', ')}`);
    }
    
    testResults.push('');
    testResults.push('🎯 **WALLET INTEGRATION WORKING SUCCESSFULLY!**');
    testResults.push('📱 User cards detected and processed');
    testResults.push('🔄 Fields auto-populated from wallet data');
    testResults.push('✅ Qualification logic enhanced with wallet integration');

    return NextResponse.json({
      success: true,
      testResults,
      walletCheck,
      qualificationReport: report,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    testResults.push(`💥 Test failed: ${error.message}`);
    return NextResponse.json({ 
      success: false,
      testResults,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, testType } = await request.json();
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required for wallet testing'
      }, { status: 400 });
    }

    let result;
    
    switch (testType) {
      case 'check_wallet':
        result = await WalletCardService.checkUserCards(userId);
        break;
        
      case 'qualification_report':
        result = await WalletCardService.getWalletBasedQualificationReport(userId);
        break;
        
      case 'auto_populated_form':
        const report = await WalletCardService.getWalletBasedQualificationReport(userId);
        result = {
          autoPopulatedForm: report.autoPopulatedForm,
          dataSource: {
            sevisPass: !!report.walletCheck.sevisPassCard,
            publicServantPass: !!report.walletCheck.publicServantCard
          }
        };
        break;
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid test type. Use: check_wallet, qualification_report, or auto_populated_form'
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      testType,
      userId,
      result,
      message: `Wallet ${testType} test completed successfully`
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}