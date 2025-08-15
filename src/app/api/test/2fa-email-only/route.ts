import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const { email, userName } = await request.json();
    
    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email is required'
      }, { status: 400 });
    }

    // Test with simple values
    const testCode = '123456';
    const testUserName = userName || 'Test User';

    console.log('Testing send2FACode method directly...');
    console.log('Email:', email);
    console.log('UserName:', testUserName);
    console.log('Code:', testCode);

    // Test the send2FACode method directly
    const result = await emailService.send2FACode(email, testUserName, testCode);

    console.log('send2FACode result:', result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '2FA email sent successfully via send2FACode method!',
        testCode: testCode,
        result: result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'send2FACode method failed',
        error: result.error,
        result: result
      });
    }

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test failed with exception',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with { "email": "test@example.com", "userName": "Test User" } to test 2FA email sending'
  });
}