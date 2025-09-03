import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

interface RefreshTokenData {
  refreshToken: string;
  deviceId?: string;
}

interface RefreshTokenResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    let body: RefreshTokenData;
    
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid request format'
      } as RefreshTokenResponse, { status: 400 });
    }

    if (!body.refreshToken) {
      return NextResponse.json({
        success: false,
        message: 'Refresh token is required'
      } as RefreshTokenResponse, { status: 400 });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

    try {
      // Verify the refresh token
      const decoded = jwt.verify(body.refreshToken, JWT_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        return NextResponse.json({
          success: false,
          message: 'Invalid token type'
        } as RefreshTokenResponse, { status: 401 });
      }

      // Verify user still exists
      const user = await db.user.findUnique({
        where: { uid: decoded.uid }
      });

      if (!user) {
        return NextResponse.json({
          success: false,
          message: 'User not found'
        } as RefreshTokenResponse, { status: 401 });
      }

      // Generate new tokens
      const accessToken = jwt.sign(
        { 
          uid: user.uid, 
          email: user.email, 
          type: 'mobile',
          deviceId: body.deviceId || decoded.deviceId 
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const newRefreshToken = jwt.sign(
        { 
          uid: user.uid, 
          type: 'refresh',
          deviceId: body.deviceId || decoded.deviceId 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return NextResponse.json({
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
        message: 'Token refreshed successfully'
      } as RefreshTokenResponse);

    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired refresh token'
      } as RefreshTokenResponse, { status: 401 });
    }

  } catch (error) {
    console.error('Token refresh error:', error);
    
    return new NextResponse(JSON.stringify({
      success: false,
      message: 'Internal server error'
    } as RefreshTokenResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}