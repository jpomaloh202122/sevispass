-- Biometric Collection Scheduling System for SevisPass
-- Run this SQL in your Supabase SQL Editor after the users table setup

-- Create biometric locations table (Police Stations in NCD Port Moresby)
CREATE TABLE IF NOT EXISTS biometric_locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  electorate VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  operating_hours VARCHAR(100) DEFAULT '8:00 AM - 4:00 PM',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create biometric appointments table
CREATE TABLE IF NOT EXISTS biometric_appointments (
  id SERIAL PRIMARY KEY,
  user_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES biometric_locations(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure one appointment per user
  UNIQUE(user_uid)
);

-- Insert the 7 specific police station locations in NCD Port Moresby
INSERT INTO biometric_locations (name, address, electorate, phone) VALUES
-- Moresby North-East Electorate
('Waigani Police Station', 'Waigani Drive, NCD', 'Moresby North-East', '+675 326 0244'),
('Gordons Police Station', 'Gordons Market Area, NCD', 'Moresby North-East', '+675 325 1899'),

-- Moresby North-West Electorate  
('Gerehu Police Station', 'Gerehu Stage 6, NCD', 'Moresby North-West', '+675 326 1455'),

-- Moresby South Electorate
('Downtown Police Station', 'Champion Parade, Port Moresby, NCD', 'Moresby South', '+675 321 1200'),
('Boroko Police Station', 'Boroko, Section 54, NCD', 'Moresby South', '+675 323 4200'),
('Koki Police Station', 'Koki Market, Koki, NCD', 'Moresby South', '+675 325 1242'),
('Badili Police Station', 'Badili, Ela Beach Road, NCD', 'Moresby South', '+675 321 3939');

-- Create time slots table for appointment scheduling
CREATE TABLE IF NOT EXISTS appointment_time_slots (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES biometric_locations(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- Monday=1, Friday=5
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_appointments INTEGER DEFAULT 4, -- 4 appointments per slot
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert standard time slots for all locations (Monday-Friday, 8 AM - 4 PM)
INSERT INTO appointment_time_slots (location_id, day_of_week, start_time, end_time, max_appointments)
SELECT 
  l.id as location_id,
  d.day_of_week,
  t.start_time,
  t.end_time,
  4 as max_appointments
FROM biometric_locations l
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) as d(day_of_week) -- Monday to Friday
CROSS JOIN (
  VALUES 
    ('08:00:00'::TIME, '10:00:00'::TIME),
    ('10:00:00'::TIME, '12:00:00'::TIME), 
    ('13:00:00'::TIME, '15:00:00'::TIME),
    ('15:00:00'::TIME, '16:00:00'::TIME)
) as t(start_time, end_time);

-- Create updated_at trigger for appointments
DROP TRIGGER IF EXISTS update_appointments_updated_at ON biometric_appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON biometric_appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_uid ON biometric_appointments(user_uid);
CREATE INDEX IF NOT EXISTS idx_appointments_location_date ON biometric_appointments(location_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON biometric_appointments(status);
CREATE INDEX IF NOT EXISTS idx_locations_electorate ON biometric_locations(electorate);

-- Enable Row Level Security (RLS) for appointments
ALTER TABLE biometric_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for appointments
CREATE POLICY "Service role can access all appointments" ON biometric_appointments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own appointments" ON biometric_appointments
  FOR SELECT USING (auth.uid()::text = user_uid);

CREATE POLICY "Users can insert their own appointments" ON biometric_appointments
  FOR INSERT WITH CHECK (auth.uid()::text = user_uid);

CREATE POLICY "Users can update their own appointments" ON biometric_appointments
  FOR UPDATE USING (auth.uid()::text = user_uid);

-- Create policies for locations (read-only for users)
CREATE POLICY "Anyone can view biometric locations" ON biometric_locations
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage locations" ON biometric_locations
  FOR ALL USING (auth.role() = 'service_role');