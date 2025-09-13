import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, validateEmail } from '@/lib/auth';
import { db } from '@/lib/db';

interface LoginData {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  requires2FA?: boolean;  // New field for 2FA requirement
  requiresEmailVerification?: boolean; // New field for email verification requirement
  uid?: string;
  email?: string; // For email verification context
  user?: {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    nid: string;
    phoneNumber: string;
    address?: string;
    createdAt: string;
  };
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    let body: LoginData;
    
    try {
      body = await request.json();
    } catch (parseError) {
      // Invalid JSON in request body
      return NextResponse.json({
        success: false,
        message: 'Invalid request format'
      } as LoginResponse, { status: 400 });
    }

    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      } as LoginResponse, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(body.email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      } as LoginResponse, { status: 400 });
    }

    // Find user by email
    let user;
    try {
      user = await db.user.findUnique({
        where: {
          email: body.email
        }
      });
    } catch (dbError) {
      // Database query error
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      } as LoginResponse, { status: 503 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      } as LoginResponse, { status: 401 });
    }

    // All registered users are verified (face verification during registration)
    // No additional email verification required

    // Verify password
    let isValidPassword;
    try {
      isValidPassword = await verifyPassword(body.password, user.password);
    } catch (verifyError) {
      // Password verification error
      return NextResponse.json({
        success: false,
        message: 'Authentication error'
      } as LoginResponse, { status: 500 });
    }
    
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      } as LoginResponse, { status: 401 });
    }

    // Password verified successfully

    // Send 2FA code instead of completing login
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
      const send2FAPayload = {
        userUid: user.uid,
        email: user.email,
        userName: `${user.firstName} ${user.lastName}`
      };
      
      const send2FAResponse = await fetch(`${baseUrl}/api/auth/send-2fa-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(send2FAPayload)
      });

      const send2FAResult = await send2FAResponse.json();

      if (!send2FAResult.success) {
        // Failed to send 2FA code
        
        // In development, if email service fails, allow bypass for testing
        if (process.env.NODE_ENV === 'development') {
          // Development mode: Bypassing 2FA email failure
          return NextResponse.json({
            success: true,
            requires2FA: true,
            uid: user.uid,
            message: 'Email service unavailable in dev mode. Use any 6-digit code for testing.'
          } as LoginResponse);
        }
        
        return NextResponse.json({
          success: false,
          message: 'Failed to send verification code. Please try again.'
        } as LoginResponse, { status: 500 });
      }

      // 2FA code sent successfully

      return NextResponse.json({
        success: true,
        requires2FA: true,
        uid: user.uid,
        message: 'Verification code sent to your email. Please check your inbox and enter the 6-digit code to complete login.'
      } as LoginResponse);

    } catch (send2FAError) {
      // Error sending 2FA code
      return NextResponse.json({
        success: false,
        message: 'Failed to send verification code. Please try again.'
      } as LoginResponse, { status: 500 });
    }

  } catch (error) {
    // Login error occurred
    
    // Ensure we always return a valid JSON response
    return new NextResponse(JSON.stringify({
      success: false,
      message: 'Internal server error'
    } as LoginResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}