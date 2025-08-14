import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailService } from '@/lib/resend';
import { validateEmail } from '@/lib/auth';

interface SendActivationRequest {
  email?: string;
  userUid?: string;
}

function generateActivationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email, userUid }: SendActivationRequest = await request.json();

    if (!email && !userUid) {
      return NextResponse.json({
        success: false,
        message: 'Either email or userUid is required'
      }, { status: 400 });
    }

    let user;
    let userEmail = email;

    // If userUid is provided, get user details from database
    if (userUid) {
      user = await db.user.findUnique({
        where: { uid: userUid },
        select: { uid: true, email: true, firstName: true, lastName: true, email_verified: true }
      });

      if (!user) {
        return NextResponse.json({
          success: false,
          message: 'User not found'
        }, { status: 404 });
      }

      userEmail = user.email;
    }

    // If email is provided directly, validate it
    if (email) {
      if (!validateEmail(email)) {
        return NextResponse.json({
          success: false,
          message: 'Invalid email format'
        }, { status: 400 });
      }

      // Try to find user by email if not already found
      if (!user) {
        user = await db.user.findFirst({
          where: { email },
          select: { uid: true, email: true, firstName: true, lastName: true, email_verified: true }
        });
      }
    }

    console.log('Sending activation email to:', userEmail, 'for user:', user?.uid || 'unknown');

    // Check if there's a recent activation code that's still valid (rate limiting)
    const existingCode = await db.emailVerificationCode.findLatest(userEmail, 'activation');
    if (existingCode && !existingCode.is_used) {
      const createdAt = new Date(existingCode.created_at);
      const now = new Date();
      const timeDiff = now.getTime() - createdAt.getTime();
      const minutesSince = Math.floor(timeDiff / (1000 * 60));

      // Rate limit: only allow new activation code every 5 minutes
      if (minutesSince < 5) {
        return NextResponse.json({
          success: false,
          message: `Please wait ${5 - minutesSince} minute(s) before requesting a new activation code`,
          retryAfter: (5 - minutesSince) * 60 // seconds
        }, { status: 429 });
      }
    }

    // Generate new activation code
    const activationCode = generateActivationCode();
    
    // Set expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Clean up old codes for this email
    try {
      await db.emailVerificationCode.cleanup();
    } catch (cleanupError) {
      console.warn('Cleanup failed (non-critical):', cleanupError);
    }

    // Save activation code to database
    const verificationRecord = await db.emailVerificationCode.create({
      email: userEmail,
      code: activationCode,
      userUid: user?.uid,
      purpose: 'activation',
      expiresAt: expiresAt.toISOString(),
      maxAttempts: 5
    });

    console.log('Activation code created:', { 
      id: verificationRecord.id, 
      email: userEmail, 
      purpose: 'activation', 
      expiresAt: expiresAt.toISOString() 
    });

    // Send activation email
    try {
      const userName = user ? `${user.firstName} ${user.lastName}` : undefined;
      const emailResult = await emailService.sendAccountActivationEmail(
        userEmail, 
        activationCode, 
        userName
      );

      if (!emailResult.success) {
        console.error('Failed to send activation email:', emailResult.error);
        return NextResponse.json({
          success: false,
          message: 'Failed to send activation email',
          error: emailResult.error
        }, { status: 500 });
      }

      console.log('Activation email sent successfully');

      return NextResponse.json({
        success: true,
        message: 'Account activation email sent successfully',
        data: {
          email: userEmail,
          userUid: user?.uid,
          expiresAt: expiresAt.toISOString(),
          expiresInHours: 24
        }
      });

    } catch (emailError) {
      console.error('Email service error:', emailError);
      return NextResponse.json({
        success: false,
        message: 'Failed to send activation email',
        error: emailError instanceof Error ? emailError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Send activation email error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to send activation email',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}