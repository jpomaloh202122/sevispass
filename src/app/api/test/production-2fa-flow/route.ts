import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email is required for testing'
      }, { status: 400 });
    }

    console.log('Production 2FA test for:', email);

    // Step 1: Find user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('uid, email, "firstName", "lastName"')
      .eq('email', email)
      .single();

    if (userError) {
      return NextResponse.json({
        success: false,
        message: 'User not found',
        error: userError.message,
        step: 'user_lookup'
      });
    }

    console.log('Found user:', user);

    // Step 2: Try to send 2FA code
    const baseUrl = process.env.NEXTAUTH_URL || request.url.replace(/\/api\/.*$/, '');
    
    const send2FAResponse = await fetch(`${baseUrl}/api/auth/send-2fa-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userUid: user.uid,
        email: user.email,
        userName: `${user.firstName} ${user.lastName}`
      })
    });

    const send2FAResult = await send2FAResponse.json();
    
    console.log('Send 2FA result:', send2FAResult);

    if (!send2FAResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to send 2FA code',
        error: send2FAResult.message,
        step: '2fa_send',
        details: send2FAResult
      });
    }

    return NextResponse.json({
      success: true,
      message: '2FA code sent successfully!',
      user: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      send2FAResult: send2FAResult
    });

  } catch (error) {
    console.error('Production 2FA test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test failed with error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}