import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'City Pass Employee Qualification Demo API',
    availableEndpoints: {
      'POST /api/debug/city-pass-demo': 'Test different qualification scenarios',
      'GET /api/city-pass/employee-qualification': 'Check user qualification status',
      'POST /api/city-pass/employee-qualification': 'Apply for qualification or auto-approval',
      'POST /api/city-pass/apply': 'Apply for city pass (with auto-qualification check)'
    },
    testScenarios: [
      {
        name: 'Fully Qualified (Auto-Approval)',
        description: 'User with SevisPass + Public Servant Pass + Port Moresby address',
        expectedOutcome: 'Instant approval and city pass issuance'
      },
      {
        name: 'Partially Qualified (Manual Application)',
        description: 'User with SevisPass + Port Moresby address (missing Public Servant Pass)',
        expectedOutcome: 'Eligible for manual application process'
      },
      {
        name: 'Not Qualified',
        description: 'User missing multiple requirements',
        expectedOutcome: 'Guidance on completing requirements'
      }
    ],
    businessRules: {
      autoApprovalCriteria: [
        'Must have active SevisPass digital ID',
        'Must have approved Public Servant Pass',
        'Must have address within Port Moresby city limits'
      ],
      portMoresbyAreas: [
        'Downtown/Central/CBD',
        'Boroko, Gordons, Korobosea',
        'Waigani, 14-Mile, University',
        'Gerehu, Tokarara, Morata',
        'Any address containing "Port Moresby" or "NCD"'
      ]
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const { scenario, userDetails } = await request.json();
    
    let testResult;
    
    switch (scenario) {
      case 'fully_qualified':
        testResult = {
          qualification: {
            isQualified: true,
            qualificationType: 'automatic',
            qualificationReason: 'You meet all requirements for automatic City Pass employee category approval: SevisPass holder, approved Public Servant Pass, and Port Moresby resident.',
            missingRequirements: [],
            recommendedActions: [],
            autoApprovalEligible: true
          },
          autoApproval: {
            success: true,
            cityPassId: `CPAE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            message: 'City Pass employee category automatically approved and issued',
            validityPeriod: 12,
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          },
          userDetails: {
            hasSevisPass: true,
            publicServantStatus: { hasApproved: true, hasPending: false },
            addressInfo: {
              address: userDetails?.address || 'Downtown Port Moresby, NCD',
              isPortMoresby: true,
              detectedAreas: ['downtown', 'port moresby', 'ncd']
            }
          }
        };
        break;
        
      case 'partially_qualified':
        testResult = {
          qualification: {
            isQualified: true,
            qualificationType: 'manual',
            qualificationReason: 'You are eligible to apply for City Pass employee category. Missing: Public Servant Pass',
            missingRequirements: ['Public Servant Pass'],
            recommendedActions: ['Apply for Public Servant Pass if you are a government employee'],
            autoApprovalEligible: false
          },
          autoApproval: {
            success: false,
            message: 'Manual application required - missing Public Servant Pass'
          },
          userDetails: {
            hasSevisPass: true,
            publicServantStatus: { hasApproved: false, hasPending: false },
            addressInfo: {
              address: userDetails?.address || 'Boroko, Port Moresby, NCD',
              isPortMoresby: true,
              detectedAreas: ['boroko', 'port moresby', 'ncd']
            }
          }
        };
        break;
        
      case 'not_qualified':
        testResult = {
          qualification: {
            isQualified: false,
            qualificationType: 'not_qualified',
            qualificationReason: 'You do not meet the minimum requirements. Missing: Public Servant Pass, Address within Port Moresby city limits',
            missingRequirements: ['Public Servant Pass', 'Address within Port Moresby city limits'],
            recommendedActions: [
              'Apply for Public Servant Pass if you are a government employee',
              'Your address must be within Port Moresby city to qualify for employee category'
            ],
            autoApprovalEligible: false
          },
          autoApproval: {
            success: false,
            message: 'Not qualified for employee category'
          },
          userDetails: {
            hasSevisPass: true,
            publicServantStatus: { hasApproved: false, hasPending: false },
            addressInfo: {
              address: userDetails?.address || 'Lae, Morobe Province',
              isPortMoresby: false,
              detectedAreas: []
            }
          }
        };
        break;
        
      case 'pending_public_servant':
        testResult = {
          qualification: {
            isQualified: true,
            qualificationType: 'manual',
            qualificationReason: 'You are eligible to apply for City Pass employee category. Missing: Approved Public Servant Pass (application pending)',
            missingRequirements: ['Approved Public Servant Pass (application pending)'],
            recommendedActions: ['Wait for your Public Servant Pass application to be approved'],
            autoApprovalEligible: false
          },
          autoApproval: {
            success: false,
            message: 'Public Servant Pass application still pending'
          },
          userDetails: {
            hasSevisPass: true,
            publicServantStatus: { 
              hasApproved: false, 
              hasPending: true,
              applicationId: 'PSI-1234567890-abcdef'
            },
            addressInfo: {
              address: userDetails?.address || 'Waigani, NCD',
              isPortMoresby: true,
              detectedAreas: ['waigani', 'ncd']
            }
          }
        };
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid scenario. Use: fully_qualified, partially_qualified, not_qualified, or pending_public_servant'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      scenario,
      testResult,
      timestamp: new Date().toISOString(),
      nextSteps: getNextSteps(testResult.qualification)
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getNextSteps(qualification: any): string[] {
  if (qualification.autoApprovalEligible) {
    return [
      'Click "Get Automatic Approval" to receive instant city pass',
      'Your digital city pass will be available in your wallet',
      'You can immediately access city employee benefits',
      'Pass expires in 12 months and can be renewed'
    ];
  } else if (qualification.isQualified) {
    return [
      'Complete missing requirements if possible',
      'Apply manually through the city pass application form',
      'Provide additional documentation as requested',
      'Wait 5-7 business days for manual review'
    ];
  } else {
    return [
      'Complete all missing requirements',
      'Ensure you have active SevisPass registration',
      'Apply for Public Servant Pass if you are a government employee',
      'Update your address to Port Moresby if applicable',
      'Recheck qualification once requirements are met'
    ];
  }
}