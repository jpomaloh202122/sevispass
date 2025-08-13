-- Fix Biometric Appointments - Remove Unique Constraint
-- This allows users to have multiple appointment records (scheduled, cancelled, completed)
-- while maintaining business logic to allow only one active scheduled appointment per user

-- Drop the existing unique constraint on user_uid
ALTER TABLE biometric_appointments 
DROP CONSTRAINT IF EXISTS biometric_appointments_user_uid_key;

-- Add a partial unique index that only applies to scheduled appointments
-- This ensures a user can only have ONE scheduled appointment, but can have multiple cancelled/completed ones
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_scheduled_appointment 
ON biometric_appointments (user_uid) 
WHERE status = 'scheduled';

-- Update any existing appointments to ensure data consistency
-- This query helps identify if there are any duplicate scheduled appointments
SELECT user_uid, COUNT(*) as scheduled_count
FROM biometric_appointments 
WHERE status = 'scheduled'
GROUP BY user_uid
HAVING COUNT(*) > 1;

-- Optional: Add a comment to document the change
COMMENT ON INDEX idx_unique_scheduled_appointment IS 'Ensures each user can only have one scheduled appointment at a time, while allowing multiple cancelled/completed appointments';