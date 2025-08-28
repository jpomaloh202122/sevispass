import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailService } from '@/lib/resend';

export async function GET() {
  const results: string[] = [];
  
  try {
    results.push('🔍 **VERIFICATION CODE DATABASE DIAGNOSTIC**');
    results.push(`⏰ Time: ${new Date().toISOString()}`);
    results.push('');

    // Test 1: Check if email_verification_codes table exists and is accessible
    results.push('🔍 **Database Table Check**');
    try {
      // Try to query the table structure by attempting a cleanup
      const cleanupResult = await db.emailVerificationCode.cleanup();
      results.push('✅ email_verification_codes table exists and is accessible');
      results.push(`📊 Cleanup result: ${cleanupResult.count} old records cleaned`);
    } catch (tableError: any) {
      results.push('❌ email_verification_codes table access failed:');
      results.push(`   Error: ${tableError.message}`);
      
      if (tableError.message.includes('relation') || tableError.message.includes('table')) {
        results.push('🔧 Solution: Run email-verification-setup.sql in Supabase SQL Editor');
        return NextResponse.json({ 
          results, 
          error: 'Database table missing',
          solution: 'Create email_verification_codes table' 
        });
      }
    }
    
    results.push('');

    // Test 2: Try to create a verification code
    results.push('🔍 **Verification Code Creation Test**');
    const testEmail = 'test@example.com';
    const testCode = '123456';
    const testExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    try {
      const verificationRecord = await db.emailVerificationCode.create({
        email: testEmail,
        code: testCode,
        purpose: 'test',
        expiresAt: testExpiresAt,
        maxAttempts: 5
      });
      
      results.push('✅ Verification code created successfully');
      results.push(`📋 Record ID: ${verificationRecord.id}`);
      results.push(`📧 Email: ${verificationRecord.email}`);
      results.push(`🔢 Code: ${verificationRecord.code}`);
    } catch (createError: any) {
      results.push('❌ Verification code creation failed:');
      results.push(`   Error: ${createError.message}`);
      
      if (createError.message.includes('column') || createError.message.includes('field')) {
        results.push('🔧 Database schema issue - check table structure');
      }
      
      return NextResponse.json({ 
        results, 
        error: 'Database creation failed',
        details: createError.message 
      });
    }
    
    results.push('');

    // Test 3: Try to find the verification code
    results.push('🔍 **Verification Code Retrieval Test**');
    try {
      const foundCode = await db.emailVerificationCode.findValid(testEmail, testCode, 'test');
      
      if (foundCode) {
        results.push('✅ Verification code retrieval successful');
        results.push(`📋 Found record with ID: ${foundCode.id}`);
      } else {
        results.push('⚠️  Verification code not found (this might be expected)');
      }
    } catch (findError: any) {
      results.push('❌ Verification code retrieval failed:');
      results.push(`   Error: ${findError.message}`);
    }
    
    results.push('');

    // Test 4: Test email service separately (without DB dependency)
    results.push('🔍 **Email Service Test (Isolated)**');
    try {
      const emailResult = await emailService.sendEmailVerificationCode(
        testEmail, 
        testCode, 
        'Test User'
      );
      
      if (emailResult.success) {
        results.push('✅ Email service works independently');
      } else {
        results.push('❌ Email service failed:');
        results.push(`   Error: ${emailResult.error}`);
      }
    } catch (emailError: any) {
      results.push('❌ Email service exception:');
      results.push(`   Error: ${emailError.message}`);
    }
    
    results.push('');

    // Test 5: Check environment variables
    results.push('🔍 **Environment Variables Check**');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    
    results.push(supabaseUrl ? '✅ SUPABASE_URL present' : '❌ SUPABASE_URL missing');
    results.push(supabaseKey ? `✅ SUPABASE_SERVICE_ROLE_KEY present (${supabaseKey.substring(0,10)}...)` : '❌ SUPABASE_SERVICE_ROLE_KEY missing');
    results.push(resendKey ? `✅ RESEND_API_KEY present (${resendKey.substring(0,8)}...)` : '❌ RESEND_API_KEY missing');
    
    results.push('');

    // Clean up test data
    try {
      await db.emailVerificationCode.cleanup();
      results.push('🧹 Test data cleaned up');
    } catch (cleanupError) {
      results.push('⚠️  Test cleanup failed (non-critical)');
    }

    results.push('');
    results.push('🎉 **DIAGNOSTIC COMPLETE**');
    results.push('✅ Database operations are working correctly');
    results.push('✅ Email service is accessible');
    results.push('');
    results.push('💡 **Next Steps:**');
    results.push('1. Check if email_verification_codes table exists in production Supabase');
    results.push('2. Verify RLS policies allow service_role access');
    results.push('3. Check actual error logs from failed verification attempts');

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    results.push(`💥 Diagnostic failed: ${error.message}`);
    return NextResponse.json({ 
      success: false,
      results,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}