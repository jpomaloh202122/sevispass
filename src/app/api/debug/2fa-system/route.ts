import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const results = [];

  try {
    // Check 1: Database connection
    results.push('🔍 Checking database connection...');
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);
    
    if (dbError) {
      results.push(`❌ Database connection failed: ${dbError.message}`);
      return NextResponse.json({ results });
    }
    results.push('✅ Database connection successful');

    // Check 2: 2FA codes table
    results.push('🔍 Checking login_2fa_codes table...');
    const { error: tableError } = await supabaseAdmin
      .from('login_2fa_codes')
      .select('id')
      .limit(1);
    
    if (tableError) {
      results.push(`❌ login_2fa_codes table error: ${tableError.message}`);
      results.push('🔧 Fix: Run 2fa-setup.sql in Supabase SQL Editor');
      return NextResponse.json({ results });
    }
    results.push('✅ login_2fa_codes table exists');

    // Check 3: Environment variables
    results.push('🔍 Checking 2FA environment variables...');
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL;
    
    if (!resendApiKey) {
      results.push('❌ RESEND_API_KEY missing from .env');
    } else {
      results.push('✅ RESEND_API_KEY present');
      results.push(`📧 Using email: ${resendFromEmail || 'default'}`);
    }

    // Check 4: Test email service
    results.push('🔍 Testing email service import...');
    try {
      const { emailService } = await import('@/lib/resend');
      results.push('✅ Email service imported successfully');
      
      // Check if send2FACode method exists
      if (typeof emailService.send2FACode === 'function') {
        results.push('✅ send2FACode method available');
      } else {
        results.push('❌ send2FACode method not found in email service');
      }
    } catch (importError) {
      results.push(`❌ Email service import failed: ${importError}`);
    }

    // Check 5: Test user lookup
    results.push('🔍 Checking sample user...');
    const { data: sampleUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('uid, email, "firstName", "lastName"')
      .limit(1)
      .single();
    
    if (userError) {
      results.push(`❌ No users found: ${userError.message}`);
    } else {
      results.push(`✅ Sample user found: ${sampleUser.email}`);
    }

    results.push('');
    results.push('📋 Summary:');
    const errors = results.filter(r => r.includes('❌')).length;
    if (errors === 0) {
      results.push('🎉 All 2FA system checks passed!');
      results.push('🔐 System should be ready for 2FA login');
    } else {
      results.push(`⚠️  ${errors} issues found. Fix them to enable 2FA.`);
    }

    return NextResponse.json({ results });

  } catch (error) {
    results.push(`💥 2FA diagnostic failed: ${error}`);
    return NextResponse.json({ results });
  }
}