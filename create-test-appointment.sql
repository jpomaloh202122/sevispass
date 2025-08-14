-- Create a test user for appointment testing
INSERT INTO users (
  uid, 
  email, 
  "firstName", 
  "lastName", 
  password, 
  is_verified, 
  email_verified,
  "createdAt"
) VALUES (
  'test-user-123',
  'test@example.com',
  'Test',
  'User',
  'hashed_password',
  true,
  true,
  NOW()
);

-- Create a test appointment for this user
INSERT INTO biometric_appointments (
  user_uid,
  location_id,
  appointment_date,
  appointment_time,
  status,
  notes
) VALUES (
  'test-user-123',
  1,  -- Waigani Police Station
  '2025-08-18',  -- Next Monday
  '08:00:00',
  'scheduled',
  'Test appointment for rescheduling'
);