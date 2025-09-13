/**
 * Debug middleware to secure debug endpoints
 * Only allows access in development environment
 */
import { NextResponse } from 'next/server';

export function checkDebugAccess() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { 
        error: 'Debug endpoints are only available in development mode',
        status: 'forbidden' 
      },
      { status: 403 }
    );
  }
  return null; // Allow access
}