-- SevisPass Users Table Setup for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(255) UNIQUE NOT NULL,
  "firstName" VARCHAR(255) NOT NULL,
  "lastName" VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  nid VARCHAR(255) UNIQUE NOT NULL,
  "phoneNumber" VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  address TEXT,
  "nidPhotoPath" TEXT,
  "facePhotoPath" TEXT,
  "profileImagePath" TEXT,
  "isVerified" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updatedAt
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nid ON users(nid);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users("phoneNumber");

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for API access
-- Service role can access all records
CREATE POLICY "Service role can access all users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Anon role can insert new users (for registration)
CREATE POLICY "Anyone can insert users" ON users
  FOR INSERT WITH CHECK (true);

-- Users can only access their own records
CREATE POLICY "Users can view their own record" ON users
  FOR SELECT USING (auth.uid()::text = uid);

CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE USING (auth.uid()::text = uid);