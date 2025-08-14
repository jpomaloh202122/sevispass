import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailService } from '@/lib/resend';
import { validateEmail } from '@/lib/auth';

interface SendVerificationRequest {
  email: string;
  purpose?: 'registration' | 'password_reset' | 'email_change';
  userUid?: string;
  userName?: string;
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email, purpose = 'registration', userUid, userName }: SendVerificationRequest = await request.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email address is required'
      }, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      }, { status: 400 });
    }

    console.log('Sending verification code to:', email, 'for purpose:', purpose);

    // Check if there's a recent code that's still valid (rate limiting)
    const existingCode = await db.emailVerificationCode.findLatest(email, purpose);
    if (existingCode && !existingCode.is_used) {
      const createdAt = new Date(existingCode.created_at);
      const now = new Date();
      const timeDiff = now.getTime() - createdAt.getTime();
      const minutesSince = Math.floor(timeDiff / (1000 * 60));

      // Rate limit: only allow new code every 2 minutes
      if (minutesSince < 2) {
        return NextResponse.json({
          success: false,
          message: `Please wait ${2 - minutesSince} minute(s) before requesting a new code`,
          retryAfter: (2 - minutesSince) * 60 // seconds
        }, { status: 429 });
      }
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Clean up old codes for this email and purpose
    try {
      await db.emailVerificationCode.cleanup();
    } catch (cleanupError) {
      console.warn('Cleanup failed (non-critical):', cleanupError);
    }

    // Save verification code to database
    const verificationRecord = await db.emailVerificationCode.create({
      email,
      code: verificationCode,
      userUid,
      purpose,
      expiresAt: expiresAt.toISOString(),
      maxAttempts: 5
    });

    console.log('Verification code created:', { 
      id: verificationRecord.id, 
      email, 
      purpose, 
      expiresAt: expiresAt.toISOString() 
    });

    // Send verification email
    try {
      const emailResult = await emailService.sendEmailVerificationCode(
        email, 
        verificationCode, 
        userName
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        return NextResponse.json({
          success: false,
          message: 'Failed to send verification email',
          error: emailResult.error
        }, { status: 500 });
      }

      console.log('Verification email sent successfully');

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email address',
        expiresAt: expiresAt.toISOString(),
        expiresInMinutes: 10
      });

    } catch (emailError) {
      console.error('Email service error:', emailError);
      return NextResponse.json({
        success: false,
        message: 'Failed to send verification email',
        error: emailError instanceof Error ? emailError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Send verification code error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to send verification code',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}