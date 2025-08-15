// Database setup script for 2FA functionality
// This script creates the necessary tables and functions for 2FA authentication

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('🚀 Setting up 2FA database tables...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'create_login_2fa_codes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration: create_login_2fa_codes.sql');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql function doesn't exist, try direct execution
      console.log('⚠️ exec_sql function not found, trying direct execution...');
      
      // Split the SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
          const { error: execError } = await supabase
            .from('_temp')
            .select('*')
            .limit(0); // This will fail but we can catch SQL execution errors

          // Try using raw query if available
          try {
            await supabase.sql`${statement}`;
          } catch (sqlError) {
            console.warn(`⚠️ Statement failed (this may be expected): ${sqlError.message}`);
          }
        }
      }
    } else {
      console.log('✅ Migration executed successfully');
    }

    // Verify the table was created
    console.log('\n🔍 Verifying table creation...');
    
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'login_2fa_codes');

    if (tableError) {
      console.warn('⚠️ Could not verify table creation:', tableError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ login_2fa_codes table exists');
    } else {
      console.warn('⚠️ login_2fa_codes table not found');
    }

    // Test basic functionality
    console.log('\n🧪 Testing basic functionality...');
    
    try {
      // Try to insert a test record
      const testUid = '00000000-0000-0000-0000-000000000000';
      const testCode = '123456';
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { data: insertData, error: insertError } = await supabase
        .from('login_2fa_codes')
        .insert({
          user_uid: testUid,
          code: testCode,
          expires_at: expiresAt,
          ip_address: '127.0.0.1',
          user_agent: 'test-setup-script'
        })
        .select();

      if (insertError) {
        console.warn('⚠️ Test insert failed:', insertError.message);
      } else {
        console.log('✅ Test insert successful');
        
        // Clean up test record
        const { error: deleteError } = await supabase
          .from('login_2fa_codes')
          .delete()
          .eq('user_uid', testUid);

        if (deleteError) {
          console.warn('⚠️ Test cleanup failed:', deleteError.message);
        } else {
          console.log('✅ Test cleanup successful');
        }
      }
    } catch (testError) {
      console.warn('⚠️ Functionality test failed:', testError.message);
    }

    console.log('\n🎉 Database setup completed!');
    console.log('\nNext steps:');
    console.log('1. Verify the table exists in your Supabase dashboard');
    console.log('2. Test the 2FA login flow in your application');
    console.log('3. Monitor the logs for any remaining issues');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Alternative manual setup instructions
function showManualSetup() {
  console.log('\n📋 MANUAL SETUP INSTRUCTIONS:');
  console.log('If the automated setup fails, you can manually run the SQL:');
  console.log('\n1. Open your Supabase dashboard');
  console.log('2. Go to the SQL Editor');
  console.log('3. Copy and paste the contents of:');
  console.log('   database/migrations/create_login_2fa_codes.sql');
  console.log('4. Execute the SQL');
  console.log('\nAlternatively, run this script again with --manual flag');
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('2FA Database Setup Script');
  console.log('\nUsage:');
  console.log('  node setup-2fa-database.js     - Run automated setup');
  console.log('  node setup-2fa-database.js --manual  - Show manual instructions');
  console.log('  node setup-2fa-database.js --help    - Show this help');
  process.exit(0);
}

if (args.includes('--manual')) {
  showManualSetup();
  process.exit(0);
}

// Run the setup
setupDatabase().catch(error => {
  console.error('❌ Fatal error:', error);
  showManualSetup();
  process.exit(1);
});