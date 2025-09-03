import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

interface MobileVerify2FAData {
  uid: string;
  code: string;
  deviceId?: string;
}

interface MobileVerify2FAResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
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
    let body: MobileVerify2FAData;
    
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid request format'
      } as MobileVerify2FAResponse, { status: 400 });
    }

    // Validate required fields
    if (!body.uid || !body.code) {
      return NextResponse.json({
        success: false,
        message: 'User ID and verification code are required'
      } as MobileVerify2FAResponse, { status: 400 });
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(body.code)) {
      return NextResponse.json({
        success: false,
        message: 'Verification code must be 6 digits'
      } as MobileVerify2FAResponse, { status: 400 });
    }

    // Find user by uid
    let user;
    try {
      user = await db.user.findUnique({
        where: {
          uid: body.uid
        }
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      } as MobileVerify2FAResponse, { status: 503 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Invalid user'
      } as MobileVerify2FAResponse, { status: 401 });
    }

    // Verify 2FA code
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const verify2FAPayload = {
        userUid: user.uid,
        code: body.code
      };
      
      const verify2FAResponse = await fetch(`${baseUrl}/api/auth/verify-2fa-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verify2FAPayload)
      });

      const verify2FAResult = await verify2FAResponse.json();

      if (!verify2FAResult.success) {
        console.error('2FA verification failed:', verify2FAResult.message);
        return NextResponse.json({
          success: false,
          message: verify2FAResult.message || 'Invalid verification code'
        } as MobileVerify2FAResponse, { status: 401 });
      }

      console.log('2FA verification successful for mobile user:', user.email);

      // Generate JWT tokens for mobile app
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
        message: 'Login successful'
      } as MobileVerify2FAResponse);

    } catch (verify2FAError) {
      console.error('Error verifying 2FA code:', verify2FAError);
      return NextResponse.json({
        success: false,
        message: 'Failed to verify code. Please try again.'
      } as MobileVerify2FAResponse, { status: 500 });
    }

  } catch (error) {
    console.error('Mobile 2FA verification error:', error);
    
    return new NextResponse(JSON.stringify({
      success: false,
      message: 'Internal server error'
    } as MobileVerify2FAResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}