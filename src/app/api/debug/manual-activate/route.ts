import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateEmail } from '@/lib/auth';

interface ManualActivateRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email }: ManualActivateRequest = await request.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email address is required'
      }, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      }, { status: 400 });
    }

    console.log('Manual account activation for:', email);

    // Find the user by email
    let user;
    try {
      user = await db.user.findUnique({
        where: { email: email }
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      }, { status: 503 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Check current status
    const currentStatus = {
      isVerified: user.isVerified,
      email_verified: user.email_verified,
      email_verified_at: user.email_verified_at
    };

    // Check if user is already verified
    if (user.isVerified && user.email_verified) {
      return NextResponse.json({
        success: true,
        message: 'Account is already verified and active',
        currentStatus
      });
    }

    // Activate the account
    try {
      await db.user.update({
        where: { email: email },
        data: { 
          isVerified: true,
          email_verified: true,
          email_verified_at: new Date().toISOString()
        }
      });
      
      console.log('Account manually activated for:', email);

      return NextResponse.json({
        success: true,
        message: 'Account successfully activated. You can now log in.',
        previousStatus: currentStatus,
        newStatus: {
          isVerified: true,
          email_verified: true,
          email_verified_at: new Date().toISOString()
        }
      });

    } catch (updateError) {
      console.error('Failed to activate account:', updateError);
      return NextResponse.json({
        success: false,
        message: 'Failed to activate account',
        error: updateError instanceof Error ? updateError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Manual activate account error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to activate account',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check user status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email parameter is required'
      }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      }, { status: 400 });
    }

    // Check if user exists
    const user = await db.user.findFirst({
      where: { email },
      select: { 
        uid: true, 
        email: true,
        isVerified: true,
        email_verified: true, 
        email_verified_at: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'No account found with this email address'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      userStatus: {
        uid: user.uid,
        email: user.email,
        isVerified: user.isVerified,
        email_verified: user.email_verified,
        email_verified_at: user.email_verified_at,
        createdAt: user.createdAt,
        canLogin: user.isVerified && user.email_verified
      }
    });

  } catch (error) {
    console.error('Check user status error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check user status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}