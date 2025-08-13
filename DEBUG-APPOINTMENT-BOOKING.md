# Debug Appointment Booking Issues

## Current Status
You're getting "Failed to book appointment. Please try again." error after completing the appointment scheduling form.

## Debugging Steps

### 1. **Check Database Setup First**
Run this SQL in your Supabase SQL Editor to verify setup:

```sql
-- Check if all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('biometric_locations', 'biometric_appointments', 'appointment_time_slots');

-- Check if locations are loaded
SELECT COUNT(*) as location_count FROM biometric_locations;
SELECT name, electorate FROM biometric_locations ORDER BY electorate, name;

-- Check if time slots are created
SELECT COUNT(*) as time_slot_count FROM appointment_time_slots;
```

**If any count is 0, run the setup scripts:**
1. `delete-users.sql` (to reset)
2. `biometric-scheduling-setup.sql` (to create everything)

### 2. **Check Console Logs**
I've added extensive logging. Open browser Developer Tools (F12) → Console tab and try booking again. Look for:

- "Frontend booking request:" - Shows data being sent
- "Direct booking request received:" - Shows API received data  
- "Error booking biometric appointment:" - Shows exact error

### 3. **Test Direct API**
The app now uses `/api/biometric/book-direct` for debugging. This bypasses the complex database wrapper.

### 4. **Common Issues & Fixes**

#### Issue A: Database Tables Missing
**Symptoms:** Console shows table/column errors
**Fix:** Run setup SQL scripts in Supabase

#### Issue B: User Not Verified
**Symptoms:** Error "User must complete face verification"
**Fix:** Check user.isVerified = true in database

#### Issue C: Time Format Mismatch
**Symptoms:** "Invalid time slot selected"
**Fix:** Time should be in 24-hour format like "08:00:00"

#### Issue D: Date Format Issues
**Symptoms:** Date-related errors
**Fix:** Date should be YYYY-MM-DD format

### 5. **Manual Database Check**
Check user verification status:

```sql
SELECT uid, "firstName", "lastName", "isVerified" 
FROM users 
WHERE uid = 'YOUR_USER_UID';
```

If isVerified is false, update it:

```sql
UPDATE users SET "isVerified" = true WHERE uid = 'YOUR_USER_UID';
```

### 6. **Test Database Insert Manually**
Try creating appointment directly in database:

```sql
INSERT INTO biometric_appointments (
  user_uid, 
  location_id, 
  appointment_date, 
  appointment_time, 
  status
) VALUES (
  'YOUR_USER_UID',
  1,
  '2025-08-14',
  '08:00:00',
  'scheduled'
);
```

### 7. **API Test with cURL**
Test the API directly:

```bash
curl -X POST http://localhost:3000/api/biometric/book-direct \
  -H "Content-Type: application/json" \
  -d '{
    "userUid": "YOUR_USER_UID",
    "locationId": 1,
    "appointmentDate": "2025-08-14", 
    "appointmentTime": "08:00:00"
  }'
```

## Quick Fix Steps

1. **Open browser console (F12)**
2. **Try booking appointment**
3. **Copy/paste console error here for analysis**
4. **Run test-biometric-setup.sql in Supabase to verify database**
5. **Check if user.isVerified = true**

## Next Steps After Debugging

Once we identify the exact error from console logs, I can:
- Fix the specific database issue
- Update API to handle the error case
- Ensure proper error messages show to users

The extensive logging I added will show us exactly where the failure occurs.