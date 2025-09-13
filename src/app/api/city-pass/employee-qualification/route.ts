import { NextRequest, NextResponse } from 'next/server';
import { CityPassQualificationService } from '@/lib/city-pass-qualification';
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
 * GET - Check qualification status for city pass employee category
 */
export async function GET(request: NextRequest) {
  try {
    const userData = verifyUserToken(request);
    
    // Get comprehensive qualification report
    const report = await CityPassQualificationService.getQualificationReport(userData.uid);
    
    return NextResponse.json({
      success: true,
      qualification: report.qualification,
      userDetails: report.userDetails,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking city pass qualification:', error);

    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to check qualification status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Apply for automatic city pass approval or process manual application
 */
export async function POST(request: NextRequest) {
  try {
    const userData = verifyUserToken(request);
    const { action } = await request.json();
    
    if (action === 'auto_approve') {
      // Try automatic approval
      const result = await CityPassQualificationService.autoApproveCityPass(userData.uid);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message,
          cityPassId: result.cityPassId,
          status: 'auto_approved',
          nextSteps: [
            'Your City Pass employee category has been automatically approved',
            'You can now access city services and benefits',
            'Your digital city pass is available in your wallet',
            'Pass expires in 12 months and can be renewed'
          ]
        });
      } else {
        return NextResponse.json({
          success: false,
          message: result.message,
          canApplyManually: true
        }, { status: 400 });
      }
    } 
    
    else if (action === 'check_and_recommend') {
      // Check qualification and provide recommendations
      const report = await CityPassQualificationService.getQualificationReport(userData.uid);
      
      let recommendedAction = 'not_eligible';
      let actionInstructions: string[] = [];
      
      if (report.qualification.autoApprovalEligible) {
        recommendedAction = 'auto_approve';
        actionInstructions = [
          'You qualify for automatic approval!',
          'Click "Get Automatic Approval" to receive your City Pass instantly',
          'No additional documentation required'
        ];
      } else if (report.qualification.isQualified) {
        recommendedAction = 'manual_application';
        actionInstructions = [
          'You can apply manually for City Pass employee category',
          'Additional documentation may be required',
          'Processing time: 5-7 business days'
        ];
      } else {
        recommendedAction = 'complete_requirements';
        actionInstructions = report.qualification.recommendedActions;
      }
      
      return NextResponse.json({
        success: true,
        qualification: report.qualification,
        recommendedAction,
        actionInstructions,
        userDetails: {
          hasSevisPass: report.userDetails.hasSevisPass,
          publicServantStatus: report.userDetails.publicServantStatus,
          addressInfo: report.userDetails.addressInfo
        }
      });
    }
    
    else {
      return NextResponse.json(
        { error: 'Invalid action. Use "auto_approve" or "check_and_recommend"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error processing city pass employee qualification:', error);

    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process qualification request' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update qualification status or re-check eligibility
 */
export async function PUT(request: NextRequest) {
  try {
    const userData = verifyUserToken(request);
    const { action, data } = await request.json();
    
    if (action === 'recheck_eligibility') {
      // Force re-check of qualification status
      const report = await CityPassQualificationService.getQualificationReport(userData.uid);
      
      return NextResponse.json({
        success: true,
        message: 'Eligibility status updated',
        qualification: report.qualification,
        userDetails: report.userDetails,
        timestamp: new Date().toISOString()
      });
    }
    
    else if (action === 'update_address') {
      // This would typically update the user's address in the database
      // For now, we'll just recheck with the provided address
      if (!data?.address) {
        return NextResponse.json(
          { error: 'Address is required for update' },
          { status: 400 }
        );
      }
      
      // In a real implementation, you would update the user's address in the database here
      // For now, we'll simulate the check with the new address
      
      return NextResponse.json({
        success: true,
        message: 'Address updated and eligibility rechecked',
        note: 'In production, this would update the user database and recheck qualification'
      });
    }
    
    else {
      return NextResponse.json(
        { error: 'Invalid action. Use "recheck_eligibility" or "update_address"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error updating city pass qualification:', error);

    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update qualification status' },
      { status: 500 }
    );
  }
}