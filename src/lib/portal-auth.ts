import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

interface TokenPayload {
  uid: string;
  email: string;
  portalId?: string;
  iat?: number;
  exp?: number;
}

export function generatePortalToken(payload: {
  uid: string;
  email: string;
  portalId?: string;
}): string {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' }
  );
}

export function verifyPortalToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function extractTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check query parameter
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');
  if (tokenParam) {
    return tokenParam;
  }

  // Check body for POST requests
  const contentType = request.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    // Note: This would need to be handled in the route handler since we can't await here
    return null;
  }

  return null;
}

export function createPortalResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export interface PortalUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  nid: string;
  verified: boolean;
  hasActiveAppointment?: boolean;
}

export function sanitizeUserForPortal(user: any): PortalUser {
  return {
    uid: user.uid,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    nid: user.nid,
    verified: true,
    hasActiveAppointment: user.hasActiveAppointment || false
  };
}