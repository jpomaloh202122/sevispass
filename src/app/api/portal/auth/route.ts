import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

interface PortalAuthRequest {
  email: string;
  password: string;
  portalId?: string;
  returnUrl?: string;
}

interface PortalAuthResponse {
  success: boolean;
  token?: string;
  user?: {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    nid: string;
    verified: boolean;
  };
  redirectUrl?: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PortalAuthRequest = await request.json();

    if (!body.email || !body.password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      } as PortalAuthResponse, { status: 400 });
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: body.email }
    });

    if (!user || !await verifyPassword(body.password, user.password)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid credentials'
      } as PortalAuthResponse, { status: 401 });
    }

    // Generate JWT token for portal integration
    const token = jwt.sign(
      {
        uid: user.uid,
        email: user.email,
        portalId: body.portalId || 'sevispass'
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: {
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        nid: user.nid,
        verified: true
      },
      redirectUrl: body.returnUrl,
      message: 'Authentication successful'
    } as PortalAuthResponse);

  } catch (error) {
    console.error('Portal auth error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    } as PortalAuthResponse, { status: 500 });
  }
}