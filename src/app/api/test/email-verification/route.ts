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
    const verificationCode = testCode || Math.floor(100000 + Math.random() * 900000).toString();

    console.log('Testing email verification template with:', { testEmail, userName, verificationCode });

    // Send verification email
    const result = await emailService.sendEmailVerificationCode(testEmail, verificationCode, userName);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Verification email test sent successfully',
        testCode: verificationCode,
        sentTo: testEmail
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send verification email test',
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Email verification test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Email verification test failed',
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
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log('Testing verification email with:', { testEmail, testName, verificationCode });

    const result = await emailService.sendEmailVerificationCode(testEmail, verificationCode, testName);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Verification email test sent successfully',
        testCode: verificationCode,
        sentTo: testEmail
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send verification email test',
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Verification email test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Verification email test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}