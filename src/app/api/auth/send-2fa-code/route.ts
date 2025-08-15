import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { emailService } from '@/lib/resend';

interface Send2FARequest {
  userUid: string;
  email: string;
  userName: string;
}

// Generate 6-digit numeric code
function generate2FACode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { userUid, email, userName }: Send2FARequest = await request.json();

    if (!userUid || !email || !userName) {
      return NextResponse.json({
        success: false,
        message: 'User UID, email, and user name are required'
      }, { status: 400 });
    }

    // Check rate limiting - only allow one code every 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recentCodes, error: recentError } = await supabaseAdmin
      .from('login_2fa_codes')
      .select('id')
      .eq('user_uid', userUid)
      .gte('created_at', twoMinutesAgo)
      .limit(1);

    if (recentError) {
      console.error('Error checking recent 2FA codes:', recentError);
      
      // In development mode, bypass database errors for testing
      if (process.env.NODE_ENV === 'development') {
        console.warn('Development mode: Bypassing rate limiting database check');
        // Continue with code generation
      } else {
        return NextResponse.json({
          success: false,
          message: 'Database error'
        }, { status: 500 });
      }
    }

    if (recentCodes && recentCodes.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Please wait 2 minutes before requesting another code',
        cooldownSeconds: 120
      }, { status: 429 });
    }

    // Invalidate any existing active codes for this user
    if (process.env.NODE_ENV !== 'development') {
      const { error: invalidateError } = await supabaseAdmin
        .from('login_2fa_codes')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('user_uid', userUid)
        .eq('is_used', false);

      if (invalidateError) {
        console.error('Error invalidating existing 2FA codes:', invalidateError);
      }
    } else {
      console.warn('Development mode: Skipping 2FA code invalidation');
    }

    // Generate new code
    const code = generate2FACode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Get request info for logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Store code in database
    let insertError = null;
    if (process.env.NODE_ENV !== 'development') {
      const { error } = await supabaseAdmin
        .from('login_2fa_codes')
        .insert({
          user_uid: userUid,
          code: code,
          expires_at: expiresAt.toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent
        });
      insertError = error;
    } else {
      console.warn('Development mode: Skipping 2FA code storage, code:', code);
    }

    if (insertError) {
      console.error('Error storing 2FA code:', insertError);
      
      // In development mode, bypass database errors for testing
      if (process.env.NODE_ENV === 'development') {
        console.warn('Development mode: Bypassing 2FA code storage error');
        return NextResponse.json({
          success: true,
          message: 'Development mode: 2FA code generation successful (database bypassed)'
        });
      }
      
      return NextResponse.json({
        success: false,
        message: 'Failed to generate verification code'
      }, { status: 500 });
    }

    // Send email with 2FA code
    try {
      const emailResult = await emailService.send2FACode(email, userName, code);
      
      if (!emailResult.success) {
        console.error('Failed to send 2FA email:', emailResult.error);
        
        // Remove the code since we couldn't send the email
        await supabaseAdmin
          .from('login_2fa_codes')
          .update({ is_used: true })
          .eq('user_uid', userUid)
          .eq('code', code);

        return NextResponse.json({
          success: false,
          message: 'Failed to send verification code to email'
        }, { status: 500 });
      }

      console.log('2FA code sent successfully to:', email);

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email',
        expiresAt: expiresAt.toISOString(),
        expiresInMinutes: 10
      });

    } catch (emailError) {
      console.error('Email service error:', emailError);
      
      // Remove the code since we couldn't send the email
      await supabaseAdmin
        .from('login_2fa_codes')
        .update({ is_used: true })
        .eq('user_uid', userUid)
        .eq('code', code);

      return NextResponse.json({
        success: false,
        message: 'Failed to send verification code'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Send 2FA code error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}