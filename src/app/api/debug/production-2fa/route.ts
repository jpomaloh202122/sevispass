import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const results = [];
  const url = new URL(request.url);

  try {
    results.push('🔍 **PRODUCTION 2FA DIAGNOSTIC**');
    results.push(`🌐 Running on: ${url.origin}`);
    results.push(`⏰ Time: ${new Date().toISOString()}`);
    results.push('');

    // Check 1: Environment Variables
    results.push('🔍 **Environment Variables Check**');
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!resendApiKey) {
      results.push('❌ RESEND_API_KEY missing');
    } else {
      results.push(`✅ RESEND_API_KEY present (${resendApiKey.substring(0, 8)}...)`);
    }
    
    if (!resendFromEmail) {
      results.push('❌ RESEND_FROM_EMAIL missing');
    } else {
      results.push(`✅ RESEND_FROM_EMAIL: ${resendFromEmail}`);
    }
    
    results.push(`🔗 NEXTAUTH_URL: ${nextAuthUrl || 'not set'}`);
    results.push(`🔗 SUPABASE_URL: ${supabaseUrl || 'not set'}`);
    results.push('');

    // Check 2: Database Connection
    results.push('🔍 **Database Connection Check**');
    try {
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1);
      
      if (dbError) {
        results.push(`❌ Database connection failed: ${dbError.message}`);
        return NextResponse.json({ results });
      }
      results.push('✅ Database connection successful');
    } catch (dbConnError) {
      results.push(`❌ Database connection error: ${dbConnError}`);
      return NextResponse.json({ results });
    }

    // Check 3: 2FA Table Check
    results.push('🔍 **2FA Table Check**');
    try {
      const { data, error: tableError } = await supabaseAdmin
        .from('login_2fa_codes')
        .select('id')
        .limit(1);
      
      if (tableError) {
        results.push(`❌ login_2fa_codes table error: ${tableError.message}`);
        results.push('🔧 **SOLUTION**: Run this SQL in Supabase:');
        results.push('```sql');
        results.push('CREATE TABLE IF NOT EXISTS login_2fa_codes (');
        results.push('  id SERIAL PRIMARY KEY,');
        results.push('  user_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,');
        results.push('  code VARCHAR(6) NOT NULL,');
        results.push('  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,');
        results.push('  attempts INTEGER DEFAULT 0,');
        results.push('  max_attempts INTEGER DEFAULT 5,');
        results.push('  is_used BOOLEAN DEFAULT FALSE,');
        results.push('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
        results.push('  used_at TIMESTAMP WITH TIME ZONE NULL,');
        results.push('  ip_address VARCHAR(45),');
        results.push('  user_agent TEXT');
        results.push(');');
        results.push('```');
        return NextResponse.json({ results });
      }
      results.push('✅ login_2fa_codes table exists');
    } catch (tableCheckError) {
      results.push(`❌ Table check error: ${tableCheckError}`);
      return NextResponse.json({ results });
    }

    // Check 4: Email Service Import
    results.push('🔍 **Email Service Check**');
    try {
      const { emailService } = await import('@/lib/resend');
      results.push('✅ Email service imported successfully');
      
      if (typeof emailService.send2FACode === 'function') {
        results.push('✅ send2FACode method available');
      } else {
        results.push('❌ send2FACode method not found');
      }
    } catch (importError) {
      results.push(`❌ Email service import failed: ${importError}`);
      return NextResponse.json({ results });
    }

    // Check 5: Sample User Check
    results.push('🔍 **Sample User Check**');
    try {
      const { data: sampleUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('uid, email, "firstName", "lastName"')
        .limit(1)
        .single();
      
      if (userError) {
        results.push(`❌ No users found: ${userError.message}`);
      } else {
        results.push(`✅ Sample user found: ${sampleUser.email}`);
        results.push(`   UID: ${sampleUser.uid}`);
      }
    } catch (userCheckError) {
      results.push(`❌ User check error: ${userCheckError}`);
    }

    // Check 6: API Route URLs
    results.push('🔍 **API Routes Check**');
    const send2FAUrl = `${url.origin}/api/auth/send-2fa-code`;
    const verify2FAUrl = `${url.origin}/api/auth/verify-2fa-code`;
    const complete2FAUrl = `${url.origin}/api/auth/complete-2fa-login`;
    
    results.push(`📍 Send 2FA: ${send2FAUrl}`);
    results.push(`📍 Verify 2FA: ${verify2FAUrl}`);
    results.push(`📍 Complete 2FA: ${complete2FAUrl}`);
    results.push('');

    // Summary
    results.push('📋 **SUMMARY**');
    const errors = results.filter(r => r.includes('❌')).length;
    if (errors === 0) {
      results.push('🎉 All production checks passed!');
      results.push('🔐 2FA system should be working on production');
    } else {
      results.push(`⚠️  ${errors} issues found that need fixing`);
    }

    results.push('');
    results.push('🔧 **NEXT STEPS IF ISSUES PERSIST**:');
    results.push('1. Check Netlify Function logs');
    results.push('2. Verify environment variables in Netlify dashboard');
    results.push('3. Run SQL setup in production Supabase');
    results.push('4. Test with a real user account');

    return NextResponse.json({ 
      results,
      metadata: {
        timestamp: new Date().toISOString(),
        environment: 'production',
        host: url.host,
        origin: url.origin
      }
    });

  } catch (error) {
    results.push(`💥 Production diagnostic failed: ${error}`);
    return NextResponse.json({ results }, { status: 500 });
  }
}