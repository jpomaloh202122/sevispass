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
    const verify2FAResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3005'}/api/auth/verify-2fa-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userUid, code })
    });

    const verify2FAResult = await verify2FAResponse.json();

    if (!verify2FAResult.success) {
      return NextResponse.json({
        success: false,
        message: verify2FAResult.message
      } as Complete2FALoginResponse, { status: verify2FAResponse.status });
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
    console.error('Complete 2FA login error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    } as Complete2FALoginResponse, { status: 500 });
  }
}