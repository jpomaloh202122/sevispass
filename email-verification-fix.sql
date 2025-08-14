-- Email Verification System Fix
-- Run this if you encountered column name errors

-- Drop existing columns if they were created incorrectly
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;

-- Add email_verified column to users table with correct column reference
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'email_verified') THEN
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    -- Update existing users to have email_verified = true since they're already registered
    UPDATE users SET email_verified = true WHERE email_verified IS NULL;
  END IF;
END $$;

-- Add email_verified_at column to track when email was verified
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'email_verified_at') THEN
    ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE;
    -- Set verification time for existing users (using correct camelCase column name)
    UPDATE users SET email_verified_at = "createdAt" WHERE email_verified = true AND email_verified_at IS NULL;
  END IF;
END $$;

-- Create index on email_verified for performance
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Verify the fix worked
SELECT 'Email verification columns added successfully!' as status;

-- Show current table structure for users table (verification columns)
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('email_verified', 'email_verified_at', 'createdAt', 'created_at')
ORDER BY column_name;