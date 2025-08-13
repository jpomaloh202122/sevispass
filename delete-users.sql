-- Delete All Registered Users and Reset Database
-- Run this SQL in your Supabase SQL Editor to clear all user data

-- First, delete all biometric appointments (references users)
DELETE FROM biometric_appointments;

-- Delete all users
DELETE FROM users;

-- Delete all appointment time slots (will be recreated with new locations)
DELETE FROM appointment_time_slots;

-- Delete all biometric locations (will be recreated with specific 7 stations)
DELETE FROM biometric_locations;

-- Reset the auto-increment sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE biometric_appointments_id_seq RESTART WITH 1;
ALTER SEQUENCE biometric_locations_id_seq RESTART WITH 1;
ALTER SEQUENCE appointment_time_slots_id_seq RESTART WITH 1;

-- Verify deletion
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as appointment_count FROM biometric_appointments;
SELECT COUNT(*) as location_count FROM biometric_locations;
SELECT COUNT(*) as time_slot_count FROM appointment_time_slots;