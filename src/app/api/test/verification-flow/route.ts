import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { testEmail, testName } = await request.json();

    if (!testEmail) {
      return NextResponse.json({
        success: false,
        message: 'Test email address is required'
      }, { status: 400 });
    }

    console.log('Testing complete verification flow for:', testEmail);

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXTAUTH_URL 
      ? process.env.NEXTAUTH_URL
      : request.url.replace(/\/api\/.*$/, '');

    // Step 1: Send verification code
    const sendCodeResponse = await fetch(`${baseUrl}/api/auth/send-verification-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        userName: testName || 'Test User',
        purpose: 'registration'
      })
    });

    const sendCodeResult = await sendCodeResponse.json();

    if (!sendCodeResult.success) {
      return NextResponse.json({
        success: false,
        step: 'send_code',
        message: 'Failed to send verification code',
        error: sendCodeResult.message
      }, { status: 500 });
    }

    // Step 2: Check status
    const statusResponse = await fetch(`${baseUrl}/api/auth/verify-code?email=${encodeURIComponent(testEmail)}&purpose=registration`);
    const statusResult = await statusResponse.json();

    // Return test results
    return NextResponse.json({
      success: true,
      message: 'Verification flow test completed successfully',
      steps: {
        send_code: {
          success: sendCodeResult.success,
          message: sendCodeResult.message,
          expiresAt: sendCodeResult.expiresAt
        },
        check_status: {
          success: statusResult.success,
          hasCode: statusResult.hasCode,
          canRetry: statusResult.data?.canRetry,
          attemptsLeft: statusResult.data?.attemptsLeft,
          isExpired: statusResult.data?.isExpired
        }
      },
      instructions: {
        next_step: 'Check your email and verify the code using POST /api/auth/verify-code',
        verify_endpoint: `${baseUrl}/api/auth/verify-code`,
        example_verify_payload: {
          email: testEmail,
          code: '123456',
          purpose: 'registration'
        }
      }
    });

  } catch (error) {
    console.error('Verification flow test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Verification flow test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}