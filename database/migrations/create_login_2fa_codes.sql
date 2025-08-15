-- Migration: Create login_2fa_codes table for 2FA authentication
-- Description: This table stores two-factor authentication codes for login verification
-- Created: 2025-01-15

-- Create the login_2fa_codes table
CREATE TABLE IF NOT EXISTS public.login_2fa_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uid VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    max_attempts INTEGER DEFAULT 5 NOT NULL,
    is_used BOOLEAN DEFAULT false NOT NULL,
    used_at TIMESTAMPTZ NULL,
    ip_address VARCHAR(45) NULL, -- Support both IPv4 and IPv6
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

-- Add foreign key constraint to users table (if it exists and has compatible type)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        -- Check if uid column exists and is compatible
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'uid'
            AND data_type IN ('character varying', 'varchar', 'text')
        ) THEN
            ALTER TABLE public.login_2fa_codes 
            ADD CONSTRAINT fk_login_2fa_codes_user_uid 
            FOREIGN KEY (user_uid) REFERENCES public.users(uid) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_2fa_codes_user_uid ON public.login_2fa_codes(user_uid);
CREATE INDEX IF NOT EXISTS idx_login_2fa_codes_expires_at ON public.login_2fa_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_2fa_codes_is_used ON public.login_2fa_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_login_2fa_codes_created_at ON public.login_2fa_codes(created_at);

-- Compound index for common queries
CREATE INDEX IF NOT EXISTS idx_login_2fa_codes_user_active ON public.login_2fa_codes(user_uid, is_used, created_at DESC);

-- Drop and recreate updated_at trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_login_2fa_codes_updated_at ON public.login_2fa_codes;
CREATE TRIGGER update_login_2fa_codes_updated_at
    BEFORE UPDATE ON public.login_2fa_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.login_2fa_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy for service role (full access)
DROP POLICY IF EXISTS "Service role can manage all 2FA codes" ON public.login_2fa_codes;
CREATE POLICY "Service role can manage all 2FA codes"
ON public.login_2fa_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for authenticated users (can only access their own codes)
DROP POLICY IF EXISTS "Users can access their own 2FA codes" ON public.login_2fa_codes;
CREATE POLICY "Users can access their own 2FA codes"
ON public.login_2fa_codes
FOR ALL
TO authenticated
USING (user_uid = auth.uid()::text)
WITH CHECK (user_uid = auth.uid()::text);

-- Policy for anonymous users (no access)
DROP POLICY IF EXISTS "Anonymous users cannot access 2FA codes" ON public.login_2fa_codes;
CREATE POLICY "Anonymous users cannot access 2FA codes"
ON public.login_2fa_codes
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.login_2fa_codes TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.login_2fa_codes TO authenticated;

-- Drop and recreate cleanup function
DROP FUNCTION IF EXISTS cleanup_expired_2fa_codes() CASCADE;
CREATE FUNCTION cleanup_expired_2fa_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.login_2fa_codes 
    WHERE expires_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_active_2fa_code function
DROP FUNCTION IF EXISTS get_active_2fa_code(VARCHAR(255), VARCHAR(6)) CASCADE;
DROP FUNCTION IF EXISTS get_active_2fa_code(UUID, VARCHAR(6)) CASCADE;
CREATE FUNCTION get_active_2fa_code(p_user_uid VARCHAR(255), p_code VARCHAR(6))
RETURNS TABLE (
    id UUID,
    code VARCHAR(6),
    expires_at TIMESTAMPTZ,
    attempts INTEGER,
    max_attempts INTEGER,
    is_used BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.code,
        l.expires_at,
        l.attempts,
        l.max_attempts,
        l.is_used
    FROM public.login_2fa_codes l
    WHERE l.user_uid = p_user_uid
        AND l.code = p_code
        AND l.is_used = false
        AND l.expires_at > NOW()
        AND l.attempts < l.max_attempts
    ORDER BY l.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_expired_2fa_codes() TO service_role;
GRANT EXECUTE ON FUNCTION get_active_2fa_code(VARCHAR(255), VARCHAR(6)) TO service_role;
GRANT EXECUTE ON FUNCTION get_active_2fa_code(VARCHAR(255), VARCHAR(6)) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.login_2fa_codes IS 'Stores two-factor authentication codes for login verification';
COMMENT ON COLUMN public.login_2fa_codes.user_uid IS 'Reference to the user attempting to log in';
COMMENT ON COLUMN public.login_2fa_codes.code IS '6-digit numeric verification code';
COMMENT ON COLUMN public.login_2fa_codes.expires_at IS 'When the code expires (typically 10 minutes after creation)';
COMMENT ON COLUMN public.login_2fa_codes.attempts IS 'Number of failed verification attempts';
COMMENT ON COLUMN public.login_2fa_codes.max_attempts IS 'Maximum allowed verification attempts (default 5)';
COMMENT ON COLUMN public.login_2fa_codes.is_used IS 'Whether the code has been successfully used';
COMMENT ON COLUMN public.login_2fa_codes.used_at IS 'When the code was successfully used';
COMMENT ON COLUMN public.login_2fa_codes.ip_address IS 'IP address of the client requesting the code';
COMMENT ON COLUMN public.login_2fa_codes.user_agent IS 'User agent string of the client';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully created login_2fa_codes table with indexes, constraints, and RLS policies';
END $$;