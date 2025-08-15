# Database Setup for 2FA

This directory contains the database migrations and setup scripts for the Two-Factor Authentication (2FA) system.

## Quick Setup

### Option 1: Automated Setup (Recommended)
```bash
cd database
node setup-2fa-database.js
```

### Option 2: Simple Execution
```bash
cd database
node execute-migration.js
```

### Option 3: Manual Setup
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `migrations/create_login_2fa_codes.sql`
4. Execute the SQL

## What Gets Created

### Table: `login_2fa_codes`
Stores two-factor authentication codes for login verification.

**Columns:**
- `id` - UUID primary key
- `user_uid` - Reference to the user (foreign key to users table)
- `code` - 6-digit numeric verification code
- `expires_at` - When the code expires (typically 10 minutes)
- `attempts` - Number of failed verification attempts
- `max_attempts` - Maximum allowed attempts (default: 5)
- `is_used` - Whether the code has been successfully used
- `used_at` - Timestamp when code was used
- `ip_address` - Client IP address
- `user_agent` - Client user agent string
- `created_at` - When the record was created
- `updated_at` - When the record was last updated

### Indexes
- `idx_login_2fa_codes_user_uid` - For user lookups
- `idx_login_2fa_codes_expires_at` - For expired code cleanup
- `idx_login_2fa_codes_is_used` - For active code queries
- `idx_login_2fa_codes_user_active` - Compound index for common queries

### Security
- **Row Level Security (RLS)** enabled
- **Service role** has full access
- **Authenticated users** can only access their own codes
- **Anonymous users** have no access

### Functions
- `cleanup_expired_2fa_codes()` - Removes old expired codes
- `get_active_2fa_code(user_uid, code)` - Retrieves valid codes for verification

## Verification

After running the setup, verify everything works:

1. **Check table exists:**
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'login_2fa_codes';
   ```

2. **Test basic functionality:**
   ```sql
   SELECT COUNT(*) FROM login_2fa_codes;
   ```

3. **Test in application:**
   - Try logging in
   - Should see 2FA code sent message
   - Enter any 6-digit code in development mode

## Troubleshooting

### Common Issues

**Error: "relation 'login_2fa_codes' does not exist"**
- Run the migration script again
- Or manually execute the SQL in Supabase dashboard

**Error: "permission denied"**
- Check your `SUPABASE_SERVICE_ROLE_KEY` is correct
- Ensure you have admin access to the database

**Error: "function exec does not exist"**
- Use Option 3 (Manual Setup) instead
- Copy SQL directly to Supabase SQL Editor

### Environment Variables Required
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Development vs Production

### Development Mode
- Database errors are bypassed
- Any 6-digit code works for testing
- Emails may not be sent

### Production Mode
- Full database validation
- Real 2FA codes required
- Email service must be configured

## Maintenance

### Cleanup Old Codes
Run periodically to remove expired codes:
```sql
SELECT cleanup_expired_2fa_codes();
```

### Monitor Usage
Check 2FA code statistics:
```sql
SELECT 
  COUNT(*) as total_codes,
  COUNT(*) FILTER (WHERE is_used = true) as used_codes,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_codes
FROM login_2fa_codes;
```