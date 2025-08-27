import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

interface ValidateTokenRequest {
  token: string;
}

interface ValidateTokenResponse {
  success: boolean;
  user?: {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    nid: string;
    verified: boolean;
    hasActiveAppointment?: boolean;
  };
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateTokenRequest = await request.json();

    if (!body.token) {
      return NextResponse.json({
        success: false,
        message: 'Token is required'
      } as ValidateTokenResponse, { status: 400 });
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(body.token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired token'
      } as ValidateTokenResponse, { status: 401 });
    }

    // Get user details
    const user = await db.user.findUnique({
      where: { uid: decoded.uid }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      } as ValidateTokenResponse, { status: 404 });
    }

    // Check for active appointments
    const activeAppointment = await db.appointment.findFirst({
      where: {
        userUid: user.uid,
        status: {
          in: ['confirmed', 'pending']
        }
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        nid: user.nid,
        verified: true,
        hasActiveAppointment: !!activeAppointment
      },
      message: 'Token validated successfully'
    } as ValidateTokenResponse);

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    } as ValidateTokenResponse, { status: 500 });
  }
}