-- Test Biometric Scheduling Setup
-- Run this to verify your database setup is working correctly

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('biometric_locations', 'biometric_appointments', 'appointment_time_slots');

-- Check biometric locations data
SELECT COUNT(*) as location_count FROM biometric_locations;

-- List all police stations
SELECT id, name, electorate, phone 
FROM biometric_locations 
WHERE is_active = true 
ORDER BY electorate, name;

-- Check time slots setup
SELECT COUNT(*) as time_slot_count FROM appointment_time_slots;

-- Sample time slots for first location
SELECT l.name, ts.day_of_week, ts.start_time, ts.end_time, ts.max_appointments
FROM appointment_time_slots ts
JOIN biometric_locations l ON l.id = ts.location_id
WHERE l.id = 1
ORDER BY ts.day_of_week, ts.start_time
LIMIT 10;

-- Check RLS policies are enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('biometric_locations', 'biometric_appointments') 
AND schemaname = 'public';

-- Check if any appointments exist
SELECT COUNT(*) as appointment_count FROM biometric_appointments;