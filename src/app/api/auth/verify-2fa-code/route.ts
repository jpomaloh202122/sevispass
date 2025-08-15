import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface Verify2FARequest {
  userUid: string;
  code: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userUid, code }: Verify2FARequest = await request.json();

    if (!userUid || !code) {
      return NextResponse.json({
        success: false,
        message: 'User UID and verification code are required'
      }, { status: 400 });
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({
        success: false,
        message: 'Verification code must be 6 digits'
      }, { status: 400 });
    }

    // Find the most recent valid code for this user
    const { data: codeRecord, error: findError } = await supabaseAdmin
      .from('login_2fa_codes')
      .select('id, code, expires_at, attempts, max_attempts, is_used')
      .eq('user_uid', userUid)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError) {
      console.error('Error finding 2FA code:', findError);
      
      if (findError.code === 'PGRST116') { // No rows returned
        // In development mode, allow any 6-digit code for testing
        if (process.env.NODE_ENV === 'development') {
          console.warn('Development mode: Bypassing 2FA verification - no code found');
          return NextResponse.json({
            success: true,
            message: 'Development bypass: 2FA verification successful'
          });
        }
        
        return NextResponse.json({
          success: false,
          message: 'No valid verification code found. Please request a new code.',
          errorCode: 'NO_CODE_FOUND'
        }, { status: 404 });
      }

      // In development mode, bypass database errors for testing
      if (process.env.NODE_ENV === 'development') {
        console.warn('Development mode: Bypassing database error for 2FA verification');
        return NextResponse.json({
          success: true,
          message: 'Development bypass: 2FA verification successful (database error bypassed)'
        });
      }
      
      return NextResponse.json({
        success: false,
        message: 'Database error'
      }, { status: 500 });
    }

    // Check if code has expired
    const now = new Date();
    const expiresAt = new Date(codeRecord.expires_at);
    
    if (now > expiresAt) {
      // Mark as used to clean up
      await supabaseAdmin
        .from('login_2fa_codes')
        .update({ is_used: true, used_at: now.toISOString() })
        .eq('id', codeRecord.id);

      return NextResponse.json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
        errorCode: 'CODE_EXPIRED'
      }, { status: 410 });
    }

    // Check if too many attempts
    if (codeRecord.attempts >= codeRecord.max_attempts) {
      // Mark as used to prevent further attempts
      await supabaseAdmin
        .from('login_2fa_codes')
        .update({ is_used: true, used_at: now.toISOString() })
        .eq('id', codeRecord.id);

      return NextResponse.json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new code.',
        errorCode: 'TOO_MANY_ATTEMPTS'
      }, { status: 429 });
    }

    // Check if code matches
    if (code !== codeRecord.code) {
      // In development mode, allow any 6-digit code for testing
      if (process.env.NODE_ENV === 'development') {
        console.warn('Development mode: Bypassing 2FA code validation');
        
        // Mark the existing code as used (if exists)
        if (codeRecord && codeRecord.id) {
          await supabaseAdmin
            .from('login_2fa_codes')
            .update({ is_used: true, used_at: new Date().toISOString() })
            .eq('id', codeRecord.id);
        }
        
        return NextResponse.json({
          success: true,
          message: 'Development bypass: 2FA verification successful'
        });
      }
      
      // Increment attempts
      const newAttempts = codeRecord.attempts + 1;
      const attemptsLeft = codeRecord.max_attempts - newAttempts;

      await supabaseAdmin
        .from('login_2fa_codes')
        .update({ attempts: newAttempts })
        .eq('id', codeRecord.id);

      return NextResponse.json({
        success: false,
        message: `Invalid verification code. ${attemptsLeft} attempts remaining.`,
        errorCode: 'INVALID_CODE',
        attemptsLeft: attemptsLeft
      }, { status: 400 });
    }

    // Code is valid - mark as used
    const { error: updateError } = await supabaseAdmin
      .from('login_2fa_codes')
      .update({ 
        is_used: true, 
        used_at: now.toISOString(),
        attempts: codeRecord.attempts + 1 
      })
      .eq('id', codeRecord.id);

    if (updateError) {
      console.error('Error marking 2FA code as used:', updateError);
      return NextResponse.json({
        success: false,
        message: 'Database error'
      }, { status: 500 });
    }

    console.log('2FA code verified successfully for user:', userUid);

    return NextResponse.json({
      success: true,
      message: 'Verification code confirmed successfully'
    });

  } catch (error) {
    console.error('Verify 2FA code error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userUid,
      code: code ? 'PROVIDED' : 'MISSING'
    });
    return NextResponse.json({
      success: false,
      message: 'Internal server error during 2FA verification'
    }, { status: 500 });
  }
}