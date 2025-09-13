import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { oidcStorage } from '@/lib/oidc-storage';
import jwt from 'jsonwebtoken';

interface Complete2FALoginRequest {
  userUid: string;
  code: string;
  // OIDC parameters for direct redirect
  clientId?: string;
  redirectUri?: string;
  state?: string;
  scope?: string;
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
    facePhoto?: string;
    isVerified?: boolean;
    createdAt: string;
  };
  token?: string; // JWT token for API authentication
  redirectUrl?: string; // For OIDC flows
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userUid, code, clientId, redirectUri, state, scope }: Complete2FALoginRequest = await request.json();

    if (!userUid || !code) {
      return NextResponse.json({
        success: false,
        message: 'User UID and verification code are required'
      } as Complete2FALoginResponse, { status: 400 });
    }

    // Verify the 2FA code
    let verify2FAResult;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3007';
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
      // 2FA verification service error
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
      // Database query error
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

    // 2FA login completed successfully

    // Check if this is an OIDC flow
    if (clientId && redirectUri) {
      // OIDC flow detected - generating authorization code
      
      // Generate authorization code directly
      const authCode = `auth_code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store the authorization code
      oidcStorage.storeAuthorizationCode({
        code: authCode,
        userId: user.uid,
        clientId,
        redirectUri,
        scope: scope || 'openid profile email',
        state,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });
      
      // Return redirect URL instead of user data
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', authCode);
      if (state) callbackUrl.searchParams.set('state', state);
      
      return NextResponse.json({
        success: true,
        redirectUrl: callbackUrl.toString(),
        message: 'Redirecting to SEVIS Portal...'
      } as Complete2FALoginResponse);
    }

    // Regular login flow (not OIDC)
    // Create session for OIDC flow
    const sessionToken = `session_${Date.now()}_${user.uid}`;
    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store session in OIDC storage
    oidcStorage.storeSession({
      sessionToken,
      userId: user.uid,
      expiresAt: sessionExpiry
    });

    // Generate JWT token for API authentication
    const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-jwt-secret-key-2024';
    const jwtToken = jwt.sign(
      { 
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        type: 'user'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const response = NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        nid: user.nid,
        phoneNumber: user.phoneNumber,
        address: user.address,
        facePhoto: user.profileImagePath, // Use profileImagePath as facePhoto
        isVerified: user.isVerified,
        createdAt: user.createdAt
      },
      token: jwtToken,
      message: '2FA verification successful. Login completed.'
    } as Complete2FALoginResponse);
    
    // Set session cookie for OIDC authorization
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    });
    
    return response;

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Internal server error during 2FA completion'
    } as Complete2FALoginResponse, { status: 500 });
  }
}