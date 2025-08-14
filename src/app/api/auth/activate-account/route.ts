import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateEmail } from '@/lib/auth';

interface ActivateAccountRequest {
  email: string;
  activationCode: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, activationCode }: ActivateAccountRequest = await request.json();

    if (!email || !activationCode) {
      return NextResponse.json({
        success: false,
        message: 'Email and activation code are required'
      }, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      }, { status: 400 });
    }

    // Validate activation code format (6 digits)
    if (!/^\d{6}$/.test(activationCode)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid activation code format'
      }, { status: 400 });
    }

    console.log('Activating account for:', email, 'with code:', activationCode);

    // Find the activation code
    const verificationRecord = await db.emailVerificationCode.findValid(email, activationCode, 'activation');

    if (!verificationRecord) {
      // Check if there's any activation code for this email to provide better error messages
      const latestCode = await db.emailVerificationCode.findLatest(email, 'activation');
      
      if (!latestCode) {
        return NextResponse.json({
          success: false,
          message: 'No activation code found. Please request a new activation email.',
          code: 'NO_CODE_FOUND'
        }, { status: 404 });
      }

      // Check if code is expired
      const now = new Date();
      const expiresAt = new Date(latestCode.expires_at);
      if (expiresAt < now) {
        return NextResponse.json({
          success: false,
          message: 'Activation code has expired. Please request a new activation email.',
          code: 'CODE_EXPIRED'
        }, { status: 400 });
      }

      // Check if code is already used
      if (latestCode.is_used) {
        return NextResponse.json({
          success: false,
          message: 'This account has already been activated.',
          code: 'ALREADY_ACTIVATED'
        }, { status: 400 });
      }

      // Check if too many attempts
      if (latestCode.attempts >= latestCode.max_attempts) {
        return NextResponse.json({
          success: false,
          message: 'Too many failed attempts. Please request a new activation email.',
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
        message: `Invalid activation code. ${attemptsLeft} attempts remaining.`,
        code: 'INVALID_CODE',
        attemptsLeft
      }, { status: 400 });
    }

    // Code is valid - mark as used
    try {
      await db.emailVerificationCode.markAsUsed(verificationRecord.id);
      console.log('Activation code marked as used:', verificationRecord.id);
    } catch (markError) {
      console.error('Failed to mark code as used:', markError);
      // Continue anyway as the code was valid
    }

    // Find and update user account
    let user = null;
    if (verificationRecord.user_uid) {
      // Update user by UID
      try {
        user = await db.user.update({
          where: { uid: verificationRecord.user_uid },
          data: { 
            email_verified: true,
            email_verified_at: new Date().toISOString(),
            isVerified: true // Also mark as verified for legacy compatibility
          }
        });
        console.log('User account activated by UID:', verificationRecord.user_uid);
      } catch (updateError) {
        console.warn('Failed to update user by UID:', updateError);
      }
    }

    // If no user found by UID, try to find by email
    if (!user) {
      try {
        user = await db.user.update({
          where: { email },
          data: { 
            email_verified: true,
            email_verified_at: new Date().toISOString(),
            isVerified: true
          }
        });
        console.log('User account activated by email:', email);
      } catch (updateError) {
        console.warn('Failed to update user by email:', updateError);
        // Account activation code was valid but user update failed
        // This might happen if user was deleted after code was generated
      }
    }

    console.log('Account activation successful for:', email);

    return NextResponse.json({
      success: true,
      message: 'Account activated successfully! You can now log in and access all features.',
      data: {
        email,
        activatedAt: new Date().toISOString(),
        userUid: verificationRecord.user_uid,
        canLogin: true
      }
    });

  } catch (error) {
    console.error('Account activation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to activate account',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check activation status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

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

    // Check if user exists and is activated
    const user = await db.user.findFirst({
      where: { email },
      select: { uid: true, email_verified: true, isVerified: true, email_verified_at: true }
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        isActivated: false,
        message: 'No account found with this email address'
      });
    }

    const isActivated = user.email_verified || user.isVerified;

    // Find the latest activation code for this email
    const latestCode = await db.emailVerificationCode.findLatest(email, 'activation');

    let codeStatus = null;
    if (latestCode) {
      const now = new Date();
      const expiresAt = new Date(latestCode.expires_at);
      const isExpired = expiresAt < now;
      const attemptsLeft = Math.max(0, latestCode.max_attempts - latestCode.attempts);

      codeStatus = {
        isUsed: latestCode.is_used,
        isExpired,
        expiresAt: latestCode.expires_at,
        attemptsLeft,
        canRetry: !latestCode.is_used && !isExpired && attemptsLeft > 0,
        createdAt: latestCode.created_at
      };
    }

    return NextResponse.json({
      success: true,
      isActivated,
      data: {
        userUid: user.uid,
        emailVerified: user.email_verified,
        isVerified: user.isVerified,
        activatedAt: user.email_verified_at,
        hasActivationCode: !!latestCode,
        codeStatus
      }
    });

  } catch (error) {
    console.error('Check activation status error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check activation status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}