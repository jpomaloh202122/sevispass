import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

interface SSORequest {
  token: string;
  action?: 'login' | 'redirect';
  returnUrl?: string;
}

interface SSOResponse {
  success: boolean;
  redirectUrl?: string;
  user?: {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    verified: boolean;
  };
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SSORequest = await request.json();

    if (!body.token) {
      return NextResponse.json({
        success: false,
        message: 'SSO token is required'
      } as SSOResponse, { status: 400 });
    }

    // Verify SSO token
    let decoded: any;
    try {
      decoded = jwt.verify(body.token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Invalid SSO token'
      } as SSOResponse, { status: 401 });
    }

    // Get user
    const user = await db.user.findUnique({
      where: { uid: decoded.uid }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      } as SSOResponse, { status: 404 });
    }

    // Handle different SSO actions
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    let redirectUrl = body.returnUrl || `${baseUrl}/dashboard`;

    // Add user context to redirect URL
    const urlParams = new URLSearchParams({
      uid: user.uid,
      email: user.email,
      sso: 'true'
    });

    redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + urlParams.toString();

    return NextResponse.json({
      success: true,
      redirectUrl,
      user: {
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        verified: true
      },
      message: 'SSO authentication successful'
    } as SSOResponse);

  } catch (error) {
    console.error('SSO error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    } as SSOResponse, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const returnUrl = url.searchParams.get('returnUrl');

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    // Verify token and redirect
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    const user = await db.user.findUnique({
      where: { uid: decoded.uid }
    });

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?error=user_not_found', request.url));
    }

    // Redirect to dashboard or specified return URL
    const redirectUrl = returnUrl || '/dashboard';
    const finalUrl = new URL(redirectUrl, request.url);
    
    // Add SSO context
    finalUrl.searchParams.set('sso', 'true');
    finalUrl.searchParams.set('uid', user.uid);

    return NextResponse.redirect(finalUrl);

  } catch (error) {
    console.error('SSO GET error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=invalid_token', request.url));
  }
}