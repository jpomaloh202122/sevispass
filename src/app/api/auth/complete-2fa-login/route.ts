import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface Complete2FALoginRequest {
  userUid: string;
  code: string;
}

interface Complete2FALoginResponse {
  success: boolean;
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
    const { userUid, code }: Complete2FALoginRequest = await request.json();

    if (!userUid || !code) {
      return NextResponse.json({
        success: false,
        message: 'User UID and verification code are required'
      } as Complete2FALoginResponse, { status: 400 });
    }

    // Verify the 2FA code
    let verify2FAResult;
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const verify2FAResponse = await fetch(`${baseUrl}/api/auth/verify-2fa-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userUid, code })
      });

      verify2FAResult = await verify2FAResponse.json();

      if (!verify2FAResult.success) {
        return NextResponse.json({
          success: false,
          message: verify2FAResult.message
        } as Complete2FALoginResponse, { status: verify2FAResponse.status });
      }
    } catch (fetchError) {
      console.error('Error calling verify-2fa-code endpoint:', fetchError);
      return NextResponse.json({
        success: false,
        message: 'Failed to verify 2FA code - network error'
      } as Complete2FALoginResponse, { status: 500 });
    }

    // 2FA code verified, now get user details and complete login
    let user;
    try {
      user = await db.user.findUnique({
        where: { uid: userUid }
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      } as Complete2FALoginResponse, { status: 503 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      } as Complete2FALoginResponse, { status: 404 });
    }

    console.log('2FA login completed successfully for user:', { uid: user.uid, email: user.email });

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        nid: user.nid,
        phoneNumber: user.phoneNumber,
        address: user.address,
        createdAt: user.createdAt
      },
      message: '2FA verification successful. Login completed.'
    } as Complete2FALoginResponse);

  } catch (error) {
    console.error('Complete 2FA login error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userUid,
      code: code ? 'PROVIDED' : 'MISSING'
    });
    return NextResponse.json({
      success: false,
      message: 'Internal server error during 2FA completion'
    } as Complete2FALoginResponse, { status: 500 });
  }
}