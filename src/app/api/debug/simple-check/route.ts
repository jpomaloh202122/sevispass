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

    // Check 2: Verification codes table
    results.push('🔍 Checking email_verification_codes table...');
    const { error: tableError } = await supabaseAdmin
      .from('email_verification_codes')
      .select('id')
      .limit(1);
    
    if (tableError) {
      results.push(`❌ email_verification_codes table error: ${tableError.message}`);
      results.push('🔧 Fix: Run email-verification-setup.sql in Supabase');
      return NextResponse.json({ results });
    }
    results.push('✅ email_verification_codes table exists');

    // Check 3: Environment variables
    results.push('🔍 Checking environment variables...');
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    
    if (!apiKey) {
      results.push('❌ RESEND_API_KEY missing from .env');
    } else {
      results.push('✅ RESEND_API_KEY present');
    }
    
    if (!fromEmail) {
      results.push('❌ RESEND_FROM_EMAIL missing from .env');
    } else {
      results.push('✅ RESEND_FROM_EMAIL present');
    }

    // Check 4: Users table columns
    results.push('🔍 Checking users table structure...');
    try {
      const { data: sample, error: sampleError } = await supabaseAdmin
        .from('users')
        .select('email_verified, email_verified_at')
        .limit(1);
      
      if (sampleError) {
        results.push(`❌ Users table missing verification columns: ${sampleError.message}`);
        results.push('🔧 Fix: Run email-verification-fix.sql in Supabase');
      } else {
        results.push('✅ Users table has verification columns');
      }
    } catch (userError) {
      results.push(`❌ Users table check failed: ${userError}`);
    }

    results.push('');
    results.push('📋 Summary:');
    const errors = results.filter(r => r.includes('❌')).length;
    if (errors === 0) {
      results.push('🎉 All checks passed! Verification system should work.');
    } else {
      results.push(`⚠️  ${errors} issues found. Fix them to enable verification.`);
    }

    return NextResponse.json({ results });

  } catch (error) {
    results.push(`💥 Diagnostic failed: ${error}`);
    return NextResponse.json({ results });
  }
}