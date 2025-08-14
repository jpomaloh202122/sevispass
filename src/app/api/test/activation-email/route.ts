import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const { testEmail, testName, testCode } = await request.json();

    if (!testEmail) {
      return NextResponse.json({
        success: false,
        message: 'Test email address is required'
      }, { status: 400 });
    }

    const userName = testName || 'Test User';
    const activationCode = testCode || Math.floor(100000 + Math.random() * 900000).toString();

    console.log('Testing activation email template with:', { testEmail, userName, activationCode });

    // Send activation email
    const result = await emailService.sendAccountActivationEmail(testEmail, activationCode, userName);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Account activation email test sent successfully',
        testCode: activationCode,
        sentTo: testEmail
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send activation email test',
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Activation email test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Activation email test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for quick testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const testEmail = url.searchParams.get('email');
  const testName = url.searchParams.get('name') || 'Test User';

  if (!testEmail) {
    return NextResponse.json({
      success: false,
      message: 'Email parameter is required (?email=test@example.com)'
    }, { status: 400 });
  }

  try {
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log('Testing activation email with:', { testEmail, testName, activationCode });

    const result = await emailService.sendAccountActivationEmail(testEmail, activationCode, testName);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Account activation email test sent successfully',
        testCode: activationCode,
        sentTo: testEmail
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send activation email test',
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Activation email test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Activation email test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}