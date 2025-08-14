-- Create the missing update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS update_appointments_updated_at ON biometric_appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON biometric_appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();