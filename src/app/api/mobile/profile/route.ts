import { NextRequest, NextResponse } from 'next/server';
import { withMobileAuth, AuthenticatedUser } from '@/lib/mobile-auth';

interface ProfileResponse {
  success: boolean;
  user?: AuthenticatedUser;
  message: string;
}

async function getProfile(request: NextRequest, user: AuthenticatedUser) {
  try {
    return NextResponse.json({
      success: true,
      user,
      message: 'Profile retrieved successfully'
    } as ProfileResponse);

  } catch (error) {
    console.error('Get profile error:', error);
    
    return new NextResponse(JSON.stringify({
      success: false,
      message: 'Internal server error'
    } as ProfileResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export const GET = withMobileAuth(getProfile);