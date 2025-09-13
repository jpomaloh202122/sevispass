import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { emailService } from '@/lib/resend';

export async function GET() {
  const diagnostics: string[] = [];
  
  try {
    diagnostics.push('🔍 **2FA SYSTEM COMPREHENSIVE TEST**');
    diagnostics.push(`⏰ Time: ${new Date().toISOString()}`);
    diagnostics.push('');

    // Test 1: Check login_2fa_codes table
    diagnostics.push('📋 **1. Login 2FA Table Check**');
    try {
      const { data, error } = await supabaseAdmin
        .from('login_2fa_codes')
        .select('*')
        .limit(1);
        
      if (error) {
        diagnostics.push(`❌ login_2fa_codes table error: ${error.message}`);
        diagnostics.push('🔧 **SOLUTION**: Run create_login_2fa_codes.sql in Supabase SQL Editor');
      } else {
        diagnostics.push('✅ login_2fa_codes table exists');
        diagnostics.push(`📊 Current records: ${data?.length || 0}`);
      }
    } catch (tableError) {
      diagnostics.push(`❌ Table check error: ${tableError}`);
    }
    diagnostics.push('');

    // Test 2: Test 2FA Code Generation and Storage
    diagnostics.push('📋 **2. 2FA Code Generation Test**');
    const testUserUid = 'test-user-' + Date.now();
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    try {
      const { data: insertResult, error: insertError } = await supabaseAdmin
        .from('login_2fa_codes')
        .insert({
          user_uid: testUserUid,
          code: testCode,
          expires_at: expiresAt,
          attempts: 0,
          max_attempts: 5,
          is_used: false,
          ip_address: 'test',
          user_agent: 'test-agent'
        })
        .select()
        .single();
      
      if (insertError) {
        diagnostics.push(`❌ 2FA code insert failed: ${insertError.message}`);
      } else {
        diagnostics.push('✅ 2FA code generation and storage successful');
        diagnostics.push(`📝 Test code: ${testCode} (expires at ${expiresAt})`);
        
        // Clean up test record
        await supabaseAdmin
          .from('login_2fa_codes')
          .delete()
          .eq('id', insertResult.id);
      }
    } catch (insertTestError) {
      diagnostics.push(`❌ 2FA insertion test error: ${insertTestError}`);
    }
    diagnostics.push('');

    // Test 3: Test Email Verification Table
    diagnostics.push('📋 **3. Email Verification Table Test**');
    try {
      const { data, error } = await supabaseAdmin
        .from('email_verification_codes')
        .select('*')
        .limit(1);
        
      if (error) {
        diagnostics.push(`❌ email_verification_codes table error: ${error.message}`);
      } else {
        diagnostics.push('✅ email_verification_codes table exists');
        diagnostics.push(`📊 Current records: ${data?.length || 0}`);
      }
    } catch (tableError) {
      diagnostics.push(`❌ Email verification table check error: ${tableError}`);
    }
    diagnostics.push('');

    // Test 4: Test Send-2FA-Code Endpoint Simulation
    diagnostics.push('📋 **4. 2FA Send Code Simulation**');
    const testEmail = 'test@example.com';
    const testUserName = 'Test User';
    
    try {
      // Simulate the 2FA code sending logic
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      // Test database storage
      const { data: storageResult, error: storageError } = await supabaseAdmin
        .from('login_2fa_codes')
        .insert({
          user_uid: testUserUid + '-2fa',
          code: generatedCode,
          expires_at: codeExpiresAt.toISOString(),
          attempts: 0,
          max_attempts: 5,
          is_used: false,
          ip_address: 'test-ip',
          user_agent: 'test-browser'
        })
        .select()
        .single();
      
      if (storageError) {
        diagnostics.push(`❌ 2FA code storage failed: ${storageError.message}`);
      } else {
        diagnostics.push('✅ 2FA code storage successful');
        
        // Test email sending
        const emailResult = await emailService.send2FACode(testEmail, testUserName, generatedCode);
        
        if (emailResult.success) {
          diagnostics.push('✅ 2FA email sending successful');
        } else {
          diagnostics.push(`❌ 2FA email sending failed: ${emailResult.error}`);
        }
        
        // Clean up test record
        await supabaseAdmin
          .from('login_2fa_codes')
          .delete()
          .eq('id', storageResult.id);
      }
    } catch (simulationError) {
      diagnostics.push(`❌ 2FA simulation error: ${simulationError}`);
    }
    diagnostics.push('');

    // Test 5: Check Recent Error Logs
    diagnostics.push('📋 **5. Recent 2FA Activity Check**');
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentCodes, error: recentError } = await supabaseAdmin
        .from('login_2fa_codes')
        .select('*')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (recentError) {
        diagnostics.push(`❌ Recent activity check failed: ${recentError.message}`);
      } else {
        diagnostics.push(`✅ Recent 2FA activity: ${recentCodes?.length || 0} codes in last 5 minutes`);
        if (recentCodes && recentCodes.length > 0) {
          recentCodes.forEach((code, index) => {
            diagnostics.push(`   ${index + 1}. User: ${code.user_uid}, Used: ${code.is_used}, Created: ${code.created_at}`);
          });
        }
      }
    } catch (activityError) {
      diagnostics.push(`❌ Activity check error: ${activityError}`);
    }
    diagnostics.push('');

    // Final Assessment
    diagnostics.push('📋 **FINAL ASSESSMENT**');
    diagnostics.push('If all tests above show ✅, then the 2FA system is working correctly.');
    diagnostics.push('If you\'re still getting "Failed to send verification code" errors:');
    diagnostics.push('1. Check browser console for client-side errors');
    diagnostics.push('2. Check network requests in browser developer tools');
    diagnostics.push('3. Verify the specific user email and data being sent');
    diagnostics.push('4. Check if the error occurs during login vs registration');

    return NextResponse.json({
      success: true,
      diagnostics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    diagnostics.push(`💥 Comprehensive test failed: ${error}`);
    return NextResponse.json({ 
      success: false,
      diagnostics,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email is required for testing'
      }, { status: 400 });
    }

    // Test the actual send-2fa-code endpoint simulation
    const testUserUid = 'test-' + Date.now();
    const testUserName = email.split('@')[0];
    
    // Simulate the full 2FA flow
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store in database
    const { data: dbResult, error: dbError } = await supabaseAdmin
      .from('login_2fa_codes')
      .insert({
        user_uid: testUserUid,
        code: code,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        max_attempts: 5,
        is_used: false,
        ip_address: '127.0.0.1',
        user_agent: 'test-agent'
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({
        success: false,
        message: 'Database storage failed',
        error: dbError.message
      }, { status: 500 });
    }

    // Send email
    const emailResult = await emailService.send2FACode(email, testUserName, code);
    
    // Clean up test record
    await supabaseAdmin
      .from('login_2fa_codes')
      .delete()
      .eq('id', dbResult.id);

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: `Test 2FA code sent to ${email}`,
        code: code, // Only for testing - never return in production
        expiresAt: expiresAt.toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Email sending failed',
        error: emailResult.error
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}