import { NextResponse } from 'next/server';
import { emailService } from '@/lib/resend';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const diagnostics: string[] = [];
  
  try {
    diagnostics.push('🔍 **VERIFICATION CODE DIAGNOSTICS**');
    diagnostics.push(`⏰ Time: ${new Date().toISOString()}`);
    diagnostics.push('');

    // Test 1: Environment Variables
    diagnostics.push('📋 **1. Environment Variables**');
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    diagnostics.push(`✅ RESEND_API_KEY: ${resendApiKey ? 'Present' : 'Missing'}`);
    diagnostics.push(`✅ RESEND_FROM_EMAIL: ${resendFromEmail || 'Missing'}`);
    diagnostics.push(`✅ SUPABASE_URL: ${supabaseUrl ? 'Present' : 'Missing'}`);
    diagnostics.push(`✅ SUPABASE_SERVICE_KEY: ${supabaseKey ? 'Present' : 'Missing'}`);
    diagnostics.push('');

    // Test 2: Database Connection
    diagnostics.push('📋 **2. Database Connection Test**');
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);
        
      if (error) {
        diagnostics.push(`❌ Database connection failed: ${error.message}`);
      } else {
        diagnostics.push('✅ Database connection successful');
      }
    } catch (dbError) {
      diagnostics.push(`❌ Database connection error: ${dbError}`);
    }
    diagnostics.push('');

    // Test 3: Email Verification Table Check
    diagnostics.push('📋 **3. Email Verification Table Check**');
    try {
      const { data, error } = await supabaseAdmin
        .from('email_verification_codes')
        .select('count')
        .limit(1);
        
      if (error) {
        diagnostics.push(`❌ email_verification_codes table error: ${error.message}`);
        diagnostics.push('🔧 **SOLUTION**: Run email-verification-setup.sql in Supabase SQL Editor');
      } else {
        diagnostics.push('✅ email_verification_codes table exists');
      }
    } catch (tableError) {
      diagnostics.push(`❌ Table check error: ${tableError}`);
    }
    diagnostics.push('');

    // Test 4: Email Service Test
    diagnostics.push('📋 **4. Email Service Test**');
    try {
      const testResult = await emailService.sendEmailVerificationCode(
        'test@example.com', 
        '123456', 
        'Test User'
      );
      
      if (testResult.success) {
        diagnostics.push('✅ Email service test successful');
      } else {
        diagnostics.push(`❌ Email service test failed: ${testResult.error}`);
      }
    } catch (emailError) {
      diagnostics.push(`❌ Email service error: ${emailError}`);
    }
    diagnostics.push('');

    // Test 5: Database Insert Test (if table exists)
    diagnostics.push('📋 **5. Database Insert Test**');
    try {
      const testCode = '999999';
      const testEmail = 'test@example.com';
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      
      const result = await db.emailVerificationCode.create({
        email: testEmail,
        code: testCode,
        purpose: 'test',
        expiresAt,
        maxAttempts: 3
      });
      
      diagnostics.push('✅ Database insert test successful');
      
      // Clean up test record
      await supabaseAdmin
        .from('email_verification_codes')
        .delete()
        .eq('id', result.id);
      
    } catch (insertError) {
      diagnostics.push(`❌ Database insert test failed: ${insertError}`);
      if (insertError instanceof Error && insertError.message.includes('does not exist')) {
        diagnostics.push('🔧 **SOLUTION**: Run email-verification-setup.sql in Supabase SQL Editor');
      }
    }
    diagnostics.push('');

    // Final Assessment
    diagnostics.push('📋 **DIAGNOSTIC SUMMARY**');
    const hasApiKey = !!resendApiKey;
    const hasFromEmail = !!resendFromEmail;
    
    if (hasApiKey && hasFromEmail) {
      diagnostics.push('✅ Email service configuration is correct');
      diagnostics.push('❓ Issue likely related to database table missing');
      diagnostics.push('');
      diagnostics.push('🔧 **RECOMMENDED FIX**:');
      diagnostics.push('1. Go to Supabase Dashboard → SQL Editor');
      diagnostics.push('2. Run the SQL from email-verification-setup.sql');
      diagnostics.push('3. Verify the table exists with: SELECT * FROM email_verification_codes LIMIT 1;');
    } else {
      diagnostics.push('❌ Email service configuration issues found');
      diagnostics.push('🔧 Fix environment variables first');
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    diagnostics.push(`💥 Diagnostic failed: ${error}`);
    return NextResponse.json({ 
      success: false,
      diagnostics,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Test actual verification code sending with real email
    const testEmail = 'pomaluwa@gmail.com'; // Use your actual email for testing
    const result = await emailService.sendEmailVerificationCode(
      testEmail, 
      '123456', 
      'Test User'
    );
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test verification email sent to ${testEmail}`,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Failed to send test email'
      }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Test email sending failed'
    }, { status: 500 });
  }
}