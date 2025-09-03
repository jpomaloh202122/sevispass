import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export interface MobileTokenPayload {
  uid: string;
  email: string;
  type: 'mobile' | 'refresh';
  deviceId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  nid: string;
  phoneNumber: string;
  address?: string;
  profileImage?: string;
  createdAt?: string;
}

export class MobileAuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'MobileAuthError';
  }
}

export function generateAccessToken(user: AuthenticatedUser, deviceId?: string): string {
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
  
  return jwt.sign(
    { 
      uid: user.uid, 
      email: user.email, 
      type: 'mobile',
      deviceId 
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

export function generateRefreshToken(uid: string, deviceId?: string): string {
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
  
  return jwt.sign(
    { 
      uid, 
      type: 'refresh',
      deviceId 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyMobileToken(token: string): MobileTokenPayload {
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as MobileTokenPayload;
    
    if (decoded.type !== 'mobile') {
      throw new MobileAuthError('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new MobileAuthError('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new MobileAuthError('Invalid token');
    }
    throw new MobileAuthError('Token verification failed');
  }
}

export function verifyRefreshToken(token: string): MobileTokenPayload {
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as MobileTokenPayload;
    
    if (decoded.type !== 'refresh') {
      throw new MobileAuthError('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new MobileAuthError('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new MobileAuthError('Invalid refresh token');
    }
    throw new MobileAuthError('Refresh token verification failed');
  }
}

export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser> {
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    throw new MobileAuthError('Missing authorization token');
  }

  const tokenData = verifyMobileToken(token);
  
  // Fetch user from database
  try {
    const user = await db.user.findUnique({
      where: { uid: tokenData.uid }
    });

    if (!user) {
      throw new MobileAuthError('User not found', 404);
    }

    return {
      uid: user.uid,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      nid: user.nid,
      phoneNumber: user.phoneNumber,
      address: user.address,
      profileImage: user.profileImage,
      createdAt: user.createdAt
    };

  } catch (error) {
    if (error instanceof MobileAuthError) {
      throw error;
    }
    
    console.error('Database error during authentication:', error);
    throw new MobileAuthError('Authentication failed', 500);
  }
}

export async function refreshTokens(refreshToken: string, deviceId?: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const tokenData = verifyRefreshToken(refreshToken);
  
  // Verify user still exists
  try {
    const user = await db.user.findUnique({
      where: { uid: tokenData.uid }
    });

    if (!user) {
      throw new MobileAuthError('User not found', 404);
    }

    // Generate new tokens
    const accessToken = generateAccessToken(user, deviceId || tokenData.deviceId);
    const newRefreshToken = generateRefreshToken(user.uid, deviceId || tokenData.deviceId);

    return {
      accessToken,
      refreshToken: newRefreshToken
    };

  } catch (error) {
    if (error instanceof MobileAuthError) {
      throw error;
    }
    
    console.error('Database error during token refresh:', error);
    throw new MobileAuthError('Token refresh failed', 500);
  }
}

// Middleware wrapper for API routes
export function withMobileAuth(handler: (request: NextRequest, user: AuthenticatedUser, ...args: any[]) => Promise<Response>) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const user = await authenticateUser(request);
      return await handler(request, user, ...args);
    } catch (error) {
      if (error instanceof MobileAuthError) {
        return new Response(JSON.stringify({
          success: false,
          message: error.message
        }), {
          status: error.statusCode,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      console.error('Unexpected auth error:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Internal server error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  };
}