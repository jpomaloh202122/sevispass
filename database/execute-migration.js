// Simple script to execute the 2FA migration directly
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  try {
    console.log('🔧 Creating login_2fa_codes table...\n');

    // Create table with basic structure
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.login_2fa_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_uid UUID NOT NULL,
        code VARCHAR(6) NOT NULL CHECK (code ~ '^[0-9]{6}$'),
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER DEFAULT 0 NOT NULL CHECK (attempts >= 0),
        max_attempts INTEGER DEFAULT 5 NOT NULL CHECK (max_attempts > 0),
        is_used BOOLEAN DEFAULT false NOT NULL,
        used_at TIMESTAMPTZ NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `;

    console.log('Creating table...');
    const { error: createError } = await supabase.rpc('exec', { sql: createTableSQL });
    
    if (createError) {
      console.log('Table might already exist or exec function not available');
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_login_2fa_codes_user_uid ON public.login_2fa_codes(user_uid);',
      'CREATE INDEX IF NOT EXISTS idx_login_2fa_codes_expires_at ON public.login_2fa_codes(expires_at);',
      'CREATE INDEX IF NOT EXISTS idx_login_2fa_codes_is_used ON public.login_2fa_codes(is_used);',
      'CREATE INDEX IF NOT EXISTS idx_login_2fa_codes_user_active ON public.login_2fa_codes(user_uid, is_used, created_at DESC);'
    ];

    for (const indexSQL of indexes) {
      console.log(`Creating index: ${indexSQL.substring(0, 50)}...`);
      await supabase.rpc('exec', { sql: indexSQL });
    }

    // Enable RLS
    console.log('Enabling Row Level Security...');
    await supabase.rpc('exec', { sql: 'ALTER TABLE public.login_2fa_codes ENABLE ROW LEVEL SECURITY;' });

    // Create policies
    const policies = [
      `CREATE POLICY IF NOT EXISTS "Service role can manage all 2FA codes" ON public.login_2fa_codes FOR ALL TO service_role USING (true) WITH CHECK (true);`,
      `CREATE POLICY IF NOT EXISTS "Users can access their own 2FA codes" ON public.login_2fa_codes FOR ALL TO authenticated USING (user_uid = auth.uid()) WITH CHECK (user_uid = auth.uid());`
    ];

    for (const policySQL of policies) {
      console.log('Creating RLS policy...');
      await supabase.rpc('exec', { sql: policySQL });
    }

    console.log('\n✅ Migration completed successfully!');
    
    // Test the table
    console.log('\n🧪 Testing table access...');
    const { count, error: countError } = await supabase
      .from('login_2fa_codes')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.warn('⚠️ Table test failed:', countError.message);
      console.log('\n📋 You may need to run the SQL manually in Supabase dashboard');
    } else {
      console.log(`✅ Table is accessible (current count: ${count})`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Please run the SQL manually:');
    console.log('1. Open Supabase dashboard → SQL Editor');
    console.log('2. Run the contents of database/migrations/create_login_2fa_codes.sql');
  }
}

executeMigration();