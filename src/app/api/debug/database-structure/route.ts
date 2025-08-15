import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const results: string[] = [];
  
  try {
    results.push('🔍 **DATABASE STRUCTURE CHECK**');
    results.push(`⏰ Time: ${new Date().toISOString()}`);
    results.push('');

    // Check if users table exists and its structure
    results.push('🔍 **Users Table Check**');
    try {
      const { data: usersCheck, error: usersError } = await supabaseAdmin
        .from('users')
        .select('uid, email')
        .limit(1);
      
      if (usersError) {
        results.push(`❌ Users table error: ${usersError.message}`);
      } else {
        results.push('✅ Users table exists and accessible');
        if (usersCheck && usersCheck.length > 0) {
          results.push(`✅ Sample user UID format: ${usersCheck[0].uid}`);
        }
      }
    } catch (error) {
      results.push(`❌ Users table exception: ${error}`);
    }
    
    results.push('');

    // Check if login_2fa_codes table exists
    results.push('🔍 **2FA Table Check**');
    try {
      const { data: tfaCheck, error: tfaError } = await supabaseAdmin
        .from('login_2fa_codes')
        .select('id, user_uid')
        .limit(1);
      
      if (tfaError) {
        results.push(`❌ 2FA table error: ${tfaError.message}`);
        results.push(`📋 Error code: ${tfaError.code}`);
        results.push(`📋 Error hint: ${tfaError.hint || 'No hint provided'}`);
        
        if (tfaError.message.includes('user_id')) {
          results.push('🔧 **SOLUTION**: The error mentions "user_id" but we use "user_uid"');
          results.push('   This suggests a RLS policy or constraint is incorrectly referencing "user_id"');
        }
      } else {
        results.push('✅ 2FA table exists and accessible');
      }
    } catch (error) {
      results.push(`❌ 2FA table exception: ${error}`);
    }
    
    results.push('');

    // Test a simple insert to identify the exact issue
    results.push('🔍 **Insert Test**');
    try {
      const testCode = '123456';
      const testUid = 'test-uid-' + Date.now();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      
      const { error: insertError } = await supabaseAdmin
        .from('login_2fa_codes')
        .insert({
          user_uid: testUid,
          code: testCode,
          expires_at: expiresAt,
          attempts: 0,
          max_attempts: 5,
          is_used: false
        });
      
      if (insertError) {
        results.push(`❌ Insert test failed: ${insertError.message}`);
        results.push(`📋 Error details: ${JSON.stringify(insertError, null, 2)}`);
      } else {
        results.push('✅ Insert test successful');
        
        // Clean up test record
        await supabaseAdmin
          .from('login_2fa_codes')
          .delete()
          .eq('user_uid', testUid);
      }
    } catch (error) {
      results.push(`❌ Insert test exception: ${error}`);
    }

    results.push('');
    results.push('📋 **RECOMMENDATIONS**:');
    results.push('1. If you see "user_id" errors, run the fix-2fa-database.sql script');
    results.push('2. Check for any RLS policies referencing "user_id" instead of "user_uid"');
    results.push('3. Ensure your users table has a "uid" column (not "user_id")');

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    results.push(`💥 Test failed: ${error}`);
    return NextResponse.json({ 
      success: false,
      results,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}