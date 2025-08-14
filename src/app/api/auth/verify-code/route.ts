import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateEmail } from '@/lib/auth';

interface VerifyCodeRequest {
  email: string;
  code: string;
  purpose?: 'registration' | 'password_reset' | 'email_change';
}

export async function POST(request: NextRequest) {
  try {
    const { email, code, purpose = 'registration' }: VerifyCodeRequest = await request.json();

    if (!email || !code) {
      return NextResponse.json({
        success: false,
        message: 'Email and verification code are required'
      }, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      }, { status: 400 });
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid verification code format'
      }, { status: 400 });
    }

    console.log('Verifying code for:', email, 'purpose:', purpose, 'code:', code);

    // Find the verification code
    const verificationRecord = await db.emailVerificationCode.findValid(email, code, purpose);

    if (!verificationRecord) {
      // Check if there's any code for this email to provide better error messages
      const latestCode = await db.emailVerificationCode.findLatest(email, purpose);
      
      if (!latestCode) {
        return NextResponse.json({
          success: false,
          message: 'No verification code found. Please request a new code.',
          code: 'NO_CODE_FOUND'
        }, { status: 404 });
      }

      // Check if code is expired
      const now = new Date();
      const expiresAt = new Date(latestCode.expires_at);
      if (expiresAt < now) {
        return NextResponse.json({
          success: false,
          message: 'Verification code has expired. Please request a new code.',
          code: 'CODE_EXPIRED'
        }, { status: 400 });
      }

      // Check if code is already used
      if (latestCode.is_used) {
        return NextResponse.json({
          success: false,
          message: 'Verification code has already been used. Please request a new code.',
          code: 'CODE_USED'
        }, { status: 400 });
      }

      // Check if too many attempts
      if (latestCode.attempts >= latestCode.max_attempts) {
        return NextResponse.json({
          success: false,
          message: 'Too many failed attempts. Please request a new code.',
          code: 'TOO_MANY_ATTEMPTS'
        }, { status: 400 });
      }

      // Increment attempts for wrong code
      try {
        await db.emailVerificationCode.incrementAttempts(latestCode.id);
      } catch (incrementError) {
        console.warn('Failed to increment attempts:', incrementError);
      }

      const attemptsLeft = latestCode.max_attempts - (latestCode.attempts + 1);
      return NextResponse.json({
        success: false,
        message: `Invalid verification code. ${attemptsLeft} attempts remaining.`,
        code: 'INVALID_CODE',
        attemptsLeft
      }, { status: 400 });
    }

    // Code is valid - mark as used
    try {
      await db.emailVerificationCode.markAsUsed(verificationRecord.id);
      console.log('Verification code marked as used:', verificationRecord.id);
    } catch (markError) {
      console.error('Failed to mark code as used:', markError);
      // Continue anyway as the code was valid
    }

    // Update user email verification status if this is for registration
    if (purpose === 'registration' && verificationRecord.user_uid) {
      try {
        await db.user.update({
          where: { uid: verificationRecord.user_uid },
          data: { 
            email_verified: true,
            email_verified_at: new Date().toISOString()
          }
        });
        console.log('User email verification status updated:', verificationRecord.user_uid);
      } catch (updateError) {
        console.warn('Failed to update user verification status:', updateError);
        // This is not critical for the verification process
      }
    }

    console.log('Email verification successful for:', email);

    return NextResponse.json({
      success: true,
      message: 'Email verification successful',
      data: {
        email,
        purpose,
        verifiedAt: new Date().toISOString(),
        userUid: verificationRecord.user_uid
      }
    });

  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to verify code',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check verification status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const purpose = url.searchParams.get('purpose') || 'registration';

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email parameter is required'
      }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      }, { status: 400 });
    }

    // Find the latest verification code for this email
    const latestCode = await db.emailVerificationCode.findLatest(email, purpose);

    if (!latestCode) {
      return NextResponse.json({
        success: true,
        hasCode: false,
        message: 'No verification code found'
      });
    }

    const now = new Date();
    const expiresAt = new Date(latestCode.expires_at);
    const isExpired = expiresAt < now;
    const attemptsLeft = Math.max(0, latestCode.max_attempts - latestCode.attempts);

    return NextResponse.json({
      success: true,
      hasCode: true,
      data: {
        isUsed: latestCode.is_used,
        isExpired,
        expiresAt: latestCode.expires_at,
        attemptsLeft,
        canRetry: !latestCode.is_used && !isExpired && attemptsLeft > 0,
        createdAt: latestCode.created_at
      }
    });

  } catch (error) {
    console.error('Check verification status error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check verification status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}