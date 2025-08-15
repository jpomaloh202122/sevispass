-- Simple migration: Create login_2fa_codes table for 2FA authentication
-- This version avoids function conflicts and focuses on the essential table

-- Drop table if it exists (for clean recreation)
DROP TABLE IF EXISTS public.login_2fa_codes CASCADE;

-- Create the login_2fa_codes table
CREATE TABLE public.login_2fa_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uid VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    max_attempts INTEGER DEFAULT 5 NOT NULL,
    is_used BOOLEAN DEFAULT false NOT NULL,
    used_at TIMESTAMPTZ NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT login_2fa_codes_code_check CHECK (code ~ '^[0-9]{6}$'),
    CONSTRAINT login_2fa_codes_attempts_check CHECK (attempts >= 0),
    CONSTRAINT login_2fa_codes_max_attempts_check CHECK (max_attempts > 0),
    CONSTRAINT login_2fa_codes_expires_at_check CHECK (expires_at > created_at),
    CONSTRAINT login_2fa_codes_used_at_check CHECK (
        (is_used = false AND used_at IS NULL) OR 
        (is_used = true AND used_at IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX idx_login_2fa_codes_user_uid ON public.login_2fa_codes(user_uid);
CREATE INDEX idx_login_2fa_codes_expires_at ON public.login_2fa_codes(expires_at);
CREATE INDEX idx_login_2fa_codes_is_used ON public.login_2fa_codes(is_used);
CREATE INDEX idx_login_2fa_codes_created_at ON public.login_2fa_codes(created_at);
CREATE INDEX idx_login_2fa_codes_user_active ON public.login_2fa_codes(user_uid, is_used, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.login_2fa_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage all 2FA codes" ON public.login_2fa_codes;
DROP POLICY IF EXISTS "Users can access their own 2FA codes" ON public.login_2fa_codes;
DROP POLICY IF EXISTS "Anonymous users cannot access 2FA codes" ON public.login_2fa_codes;

-- Create RLS policies
CREATE POLICY "Service role can manage all 2FA codes"
ON public.login_2fa_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can access their own 2FA codes"
ON public.login_2fa_codes
FOR ALL
TO authenticated
USING (user_uid = auth.uid()::text)
WITH CHECK (user_uid = auth.uid()::text);

CREATE POLICY "Anonymous users cannot access 2FA codes"
ON public.login_2fa_codes
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.login_2fa_codes TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.login_2fa_codes TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.login_2fa_codes IS 'Stores two-factor authentication codes for login verification';
COMMENT ON COLUMN public.login_2fa_codes.user_uid IS 'Reference to the user attempting to log in (VARCHAR to match users.uid)';
COMMENT ON COLUMN public.login_2fa_codes.code IS '6-digit numeric verification code';
COMMENT ON COLUMN public.login_2fa_codes.expires_at IS 'When the code expires (typically 10 minutes after creation)';
COMMENT ON COLUMN public.login_2fa_codes.attempts IS 'Number of failed verification attempts';
COMMENT ON COLUMN public.login_2fa_codes.max_attempts IS 'Maximum allowed verification attempts (default 5)';
COMMENT ON COLUMN public.login_2fa_codes.is_used IS 'Whether the code has been successfully used';
COMMENT ON COLUMN public.login_2fa_codes.used_at IS 'When the code was successfully used';

-- Success message
SELECT 'Successfully created login_2fa_codes table with indexes and RLS policies' AS result;