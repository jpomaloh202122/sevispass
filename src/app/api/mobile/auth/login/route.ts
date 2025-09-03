import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, validateEmail } from '@/lib/auth';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

interface MobileLoginData {
  email: string;
  password: string;
  deviceId?: string;
}

interface MobileLoginResponse {
  success: boolean;
  requires2FA?: boolean;
  accessToken?: string;
  refreshToken?: string;
  uid?: string;
  user?: {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    nid: string;
    phoneNumber: string;
    address?: string;
    profileImage?: string;
  };
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    let body: MobileLoginData;
    
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid request format'
      } as MobileLoginResponse, { status: 400 });
    }

    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      } as MobileLoginResponse, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(body.email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      } as MobileLoginResponse, { status: 400 });
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
      console.error('Database query error:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      } as MobileLoginResponse, { status: 503 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      } as MobileLoginResponse, { status: 401 });
    }

    // Verify password
    let isValidPassword;
    try {
      isValidPassword = await verifyPassword(body.password, user.password);
    } catch (verifyError) {
      console.error('Password verification error:', verifyError);
      return NextResponse.json({
        success: false,
        message: 'Authentication error'
      } as MobileLoginResponse, { status: 500 });
    }
    
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      } as MobileLoginResponse, { status: 401 });
    }

    console.log('Password verified for mobile user:', { uid: user.uid, email: user.email });

    // Send 2FA code for mobile login
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
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
        console.error('Failed to send 2FA code:', send2FAResult.message);
        
        // In development, if email service fails, allow bypass for testing
        if (process.env.NODE_ENV === 'development') {
          console.warn('Development mode: Bypassing 2FA email failure');
          
          // Generate tokens for development bypass
          const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
          const accessToken = jwt.sign(
            { 
              uid: user.uid, 
              email: user.email, 
              type: 'mobile',
              deviceId: body.deviceId 
            },
            JWT_SECRET,
            { expiresIn: '1h' }
          );
          
          const refreshToken = jwt.sign(
            { 
              uid: user.uid, 
              type: 'refresh',
              deviceId: body.deviceId 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          return NextResponse.json({
            success: true,
            accessToken,
            refreshToken,
            user: {
              uid: user.uid,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              nid: user.nid,
              phoneNumber: user.phoneNumber,
              address: user.address,
              profileImage: user.profileImage
            },
            message: 'Development mode: Login successful (2FA bypassed)'
          } as MobileLoginResponse);
        }
        
        return NextResponse.json({
          success: false,
          message: 'Failed to send verification code. Please try again.'
        } as MobileLoginResponse, { status: 500 });
      }

      console.log('2FA code sent successfully for mobile login:', user.email);

      return NextResponse.json({
        success: true,
        requires2FA: true,
        uid: user.uid,
        message: 'Verification code sent to your email. Please check your inbox and enter the 6-digit code to complete login.'
      } as MobileLoginResponse);

    } catch (send2FAError) {
      console.error('Error sending 2FA code:', send2FAError);
      return NextResponse.json({
        success: false,
        message: 'Failed to send verification code. Please try again.'
      } as MobileLoginResponse, { status: 500 });
    }

  } catch (error) {
    console.error('Mobile login error:', error);
    
    return new NextResponse(JSON.stringify({
      success: false,
      message: 'Internal server error'
    } as MobileLoginResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}