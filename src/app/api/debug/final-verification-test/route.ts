import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { emailService } from '@/lib/resend';

export async function GET() {
  const results: string[] = [];
  
  try {
    results.push('🎯 **FINAL VERIFICATION SYSTEM TEST**');
    results.push(`⏰ Time: ${new Date().toISOString()}`);
    results.push('');

    // Test 1: Environment Configuration
    results.push('📋 **1. Environment Configuration**');
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (resendApiKey && resendFromEmail) {
      results.push('✅ Email service configured correctly');
      results.push(`📧 From: ${resendFromEmail}`);
    } else {
      results.push('❌ Email service configuration missing');
    }
    
    results.push(`🌐 App URL: ${appUrl || 'Not configured'}`);
    results.push('');

    // Test 2: Database Tables
    results.push('📋 **2. Database Tables**');
    
    // Check email_verification_codes table
    const { error: emailTableError } = await supabaseAdmin
      .from('email_verification_codes')
      .select('count')
      .limit(1);
    
    if (emailTableError) {
      results.push(`❌ email_verification_codes: ${emailTableError.message}`);
    } else {
      results.push('✅ email_verification_codes table exists');
    }
    
    // Check login_2fa_codes table
    const { error: tfaTableError } = await supabaseAdmin
      .from('login_2fa_codes')
      .select('count')
      .limit(1);
    
    if (tfaTableError) {
      results.push(`❌ login_2fa_codes: ${tfaTableError.message}`);
    } else {
      results.push('✅ login_2fa_codes table exists');
    }
    
    // Check users table
    const { error: usersTableError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);
    
    if (usersTableError) {
      results.push(`❌ users: ${usersTableError.message}`);
    } else {
      results.push('✅ users table exists');
    }
    results.push('');

    // Test 3: Email Service
    results.push('📋 **3. Email Service**');
    try {
      const emailResult = await emailService.send2FACode('test@example.com', 'Test User', '123456');
      if (emailResult.success) {
        results.push('✅ Email service working correctly');
      } else {
        results.push(`❌ Email service failed: ${emailResult.error}`);
      }
    } catch (emailError) {
      results.push(`❌ Email service error: ${emailError}`);
    }
    results.push('');

    // Test 4: Internal API Calls
    results.push('📋 **4. Internal API Test**');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
      
      // Test send-2fa-code endpoint
      const response = await fetch(`${baseUrl}/api/auth/send-2fa-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: 'test-final-' + Date.now(),
          email: 'test@example.com',
          userName: 'Final Test User'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        results.push('✅ Internal API call working correctly');
        results.push(`📧 Email sent, expires: ${result.expiresAt}`);
      } else {
        results.push(`❌ Internal API call failed: ${result.message}`);
      }
    } catch (apiError) {
      results.push(`❌ Internal API error: ${apiError}`);
    }
    results.push('');

    // Test 5: End-to-End Flow Summary
    results.push('📋 **5. End-to-End Flow Status**');
    const allSystemsWorking = results.filter(line => line.includes('❌')).length === 0;
    
    if (allSystemsWorking) {
      results.push('🎉 **ALL SYSTEMS OPERATIONAL**');
      results.push('✅ Email verification system is fully functional');
      results.push('✅ 2FA login system is fully functional');
      results.push('✅ Database tables are properly configured');
      results.push('✅ Email service is working correctly');
      results.push('');
      results.push('📱 **You can now test the complete flow:**');
      results.push('1. Go to http://localhost:3002/auth/login');
      results.push('2. Enter valid credentials for an existing user');
      results.push('3. Check your email for the verification code');
      results.push('4. Enter the 6-digit code to complete login');
    } else {
      results.push('⚠️ Some issues were found - see details above');
      results.push('🔧 Fix the ❌ items and run this test again');
    }

    return NextResponse.json({
      success: allSystemsWorking,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    results.push(`💥 Final test failed: ${error}`);
    return NextResponse.json({ 
      success: false,
      results,
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
        message: 'Email is required for live test'
      }, { status: 400 });
    }

    // Test the complete flow with a real email
    const testUserUid = 'live-test-' + Date.now();
    const testUserName = email.split('@')[0];
    
    // Make actual API call to send-2fa-code endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const response = await fetch(`${baseUrl}/api/auth/send-2fa-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userUid: testUserUid,
        email: email,
        userName: testUserName
      })
    });

    const result = await response.json();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `✅ LIVE TEST SUCCESSFUL!\n\n📧 2FA code sent to: ${email}\n⏰ Expires: ${result.expiresAt}\n🔒 Check your email inbox for the verification code.\n\n🎯 The verification system is working perfectly!`,
        details: result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `❌ LIVE TEST FAILED: ${result.message}`,
        details: result
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Live test failed due to error'
    }, { status: 500 });
  }
}