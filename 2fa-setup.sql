-- Two-Factor Authentication (2FA) Setup for SevisPass
-- Run this SQL in your Supabase SQL Editor

-- Create 2FA codes table for login verification
CREATE TABLE IF NOT EXISTS login_2fa_codes (
  id SERIAL PRIMARY KEY,
  user_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  -- Ensure only one active code per user at a time
  UNIQUE(user_uid, is_used) DEFERRABLE INITIALLY DEFERRED
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_2fa_codes_user_uid ON login_2fa_codes(user_uid);
CREATE INDEX IF NOT EXISTS idx_2fa_codes_expires ON login_2fa_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_2fa_codes_used ON login_2fa_codes(is_used);

-- Create cleanup function to remove expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM login_2fa_codes 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Set up row level security
ALTER TABLE login_2fa_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for 2FA codes
CREATE POLICY "Service role can manage 2FA codes" ON login_2fa_codes
  FOR ALL USING (auth.role() = 'service_role');

-- Optional: Create a policy for users to view their own codes (for debugging)
CREATE POLICY "Users can view their own 2FA codes" ON login_2fa_codes
  FOR SELECT USING (auth.uid()::text = user_uid);

-- Add comment for documentation
COMMENT ON TABLE login_2fa_codes IS 'Stores 2FA verification codes sent during login process';
COMMENT ON COLUMN login_2fa_codes.code IS '6-digit numeric code sent to user email';
COMMENT ON COLUMN login_2fa_codes.expires_at IS 'Code expires 10 minutes after creation';
COMMENT ON COLUMN login_2fa_codes.attempts IS 'Number of verification attempts made';
COMMENT ON COLUMN login_2fa_codes.max_attempts IS 'Maximum attempts allowed (default: 5)';