-- Email Verification System Setup
-- Run this SQL in your Supabase SQL Editor to add email verification functionality

-- Create email verification codes table
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  user_uid VARCHAR(255), -- Optional reference to user if already created
  purpose VARCHAR(50) NOT NULL DEFAULT 'registration', -- 'registration', 'password_reset', 'email_change'
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_email ON email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_code ON email_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON email_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_user_uid ON email_verification_codes(user_uid);

-- Enable Row Level Security
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can access all verification codes" ON email_verification_codes
  FOR ALL USING (auth.role() = 'service_role');

-- Function to clean up expired codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM email_verification_codes 
  WHERE expires_at < NOW() OR is_used = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add email_verified column to users table if it doesn't exist
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
    -- Set verification time for existing users (using correct column name)
    UPDATE users SET email_verified_at = "createdAt" WHERE email_verified = true AND email_verified_at IS NULL;
  END IF;
END $$;

-- Create index on email_verified for performance
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Function to generate a 6-digit verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS VARCHAR(6) AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Verification stats view (optional - for admin monitoring)
CREATE OR REPLACE VIEW verification_stats AS
SELECT 
  purpose,
  COUNT(*) as total_codes,
  COUNT(*) FILTER (WHERE is_used = true) as used_codes,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_codes,
  COUNT(*) FILTER (WHERE is_used = false AND expires_at >= NOW()) as active_codes,
  AVG(attempts) as avg_attempts
FROM email_verification_codes
GROUP BY purpose;

-- Grant permissions for the verification stats view
ALTER VIEW verification_stats OWNER TO postgres;

-- Test the setup
SELECT 'Email verification system setup completed successfully!' as status;
SELECT 'Generated sample code: ' || generate_verification_code() as test_code;