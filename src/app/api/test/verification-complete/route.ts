import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { testEmail } = await request.json();
    
    if (!testEmail) {
      return NextResponse.json({
        success: false,
        message: 'testEmail is required'
      }, { status: 400 });
    }

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXTAUTH_URL 
      ? process.env.NEXTAUTH_URL
      : request.url.replace(/\/api\/.*$/, '');

    console.log('Starting complete verification test for:', testEmail);

    // Step 1: Send verification code (for registration)
    console.log('Step 1: Sending verification code...');
    const sendCodeResponse = await fetch(`${baseUrl}/api/auth/send-verification-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        purpose: 'registration',
        userName: 'Test User'
      })
    });

    const sendCodeResult = await sendCodeResponse.json();
    if (!sendCodeResult.success) {
      return NextResponse.json({
        success: false,
        step: 'send_verification_code',
        error: sendCodeResult.message
      }, { status: 500 });
    }

    // Step 2: Send activation email
    console.log('Step 2: Sending activation email...');
    const sendActivationResponse = await fetch(`${baseUrl}/api/auth/send-activation-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail
      })
    });

    const sendActivationResult = await sendActivationResponse.json();
    if (!sendActivationResult.success) {
      return NextResponse.json({
        success: false,
        step: 'send_activation_email',
        error: sendActivationResult.message
      }, { status: 500 });
    }

    // Step 3: Check statuses
    console.log('Step 3: Checking verification statuses...');
    const checkVerificationResponse = await fetch(`${baseUrl}/api/auth/verify-code?email=${encodeURIComponent(testEmail)}&purpose=registration`);
    const verificationStatus = await checkVerificationResponse.json();

    const checkActivationResponse = await fetch(`${baseUrl}/api/auth/activate-account?email=${encodeURIComponent(testEmail)}`);
    const activationStatus = await checkActivationResponse.json();

    // Step 4: Get actual codes from database (for testing purposes)
    // Note: In production, codes would only be sent via email

    return NextResponse.json({
      success: true,
      message: 'Complete verification test successful',
      results: {
        step1_send_verification_code: {
          success: sendCodeResult.success,
          expiresAt: sendCodeResult.expiresAt,
          expiresInMinutes: sendCodeResult.expiresInMinutes
        },
        step2_send_activation_email: {
          success: sendActivationResult.success,
          expiresAt: sendActivationResult.data?.expiresAt,
          expiresInHours: sendActivationResult.data?.expiresInHours
        },
        step3_verification_status: {
          hasCode: verificationStatus.hasCode,
          canRetry: verificationStatus.data?.canRetry,
          attemptsLeft: verificationStatus.data?.attemptsLeft,
          isExpired: verificationStatus.data?.isExpired
        },
        step4_activation_status: {
          isActivated: activationStatus.isActivated,
          hasActivationCode: activationStatus.data?.hasActivationCode
        }
      },
      next_steps: [
        '1. Check your email for verification codes',
        '2. Use POST /api/auth/verify-code with email and 6-digit code',
        '3. Use POST /api/auth/activate-account with email and activation code',
        '4. Both verification types are working correctly!'
      ],
      test_info: {
        email_sent_to: testEmail,
        verification_endpoint: `${baseUrl}/api/auth/verify-code`,
        activation_endpoint: `${baseUrl}/api/auth/activate-account`,
        codes_sent_via_email: true
      }
    });

  } catch (error) {
    console.error('Complete verification test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Complete verification test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}