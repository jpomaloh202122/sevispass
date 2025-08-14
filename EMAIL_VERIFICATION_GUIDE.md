# Email Verification System Guide

## Overview

This system implements a secure 6-digit email verification code system for SevisPass. Users receive a verification code via email after step 1 of the registration process and must enter it to complete their registration.

## Database Setup

**IMPORTANT:** Run this SQL in your Supabase SQL Editor before using the system:

### Option 1: Fresh Setup
```sql
-- Run the email-verification-setup.sql file
-- This creates the email_verification_codes table and related functions
```

### Option 2: If you get column errors
If you encounter errors like `column "created_at" does not exist`, run:
```sql
-- Run the email-verification-fix.sql file instead
-- This handles the correct camelCase column names in your users table
```

**Common Issue:** The users table uses `createdAt` (camelCase) not `created_at` (snake_case). The fix script handles this properly.

## API Endpoints

### 1. Send Verification Code
**Endpoint:** `POST /api/auth/send-verification-code`

**Request Body:**
```json
{
  "email": "user@example.com",
  "purpose": "registration", // optional: registration, password_reset, email_change
  "userUid": "user-uid-123", // optional: link to specific user
  "userName": "John Doe" // optional: for personalized emails
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent to your email address",
  "expiresAt": "2024-12-16T10:10:00.000Z",
  "expiresInMinutes": 10
}
```

**Features:**
- Generates random 6-digit code
- 10-minute expiration
- Rate limiting (2-minute cooldown between requests)
- Automatic cleanup of old codes

### 2. Verify Code
**Endpoint:** `POST /api/auth/verify-code`

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "purpose": "registration" // optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verification successful",
  "data": {
    "email": "user@example.com",
    "purpose": "registration",
    "verifiedAt": "2024-12-16T10:05:00.000Z",
    "userUid": "user-uid-123"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid verification code. 3 attempts remaining.",
  "code": "INVALID_CODE",
  "attemptsLeft": 3
}
```

**Error Codes:**
- `NO_CODE_FOUND` - No verification code exists
- `CODE_EXPIRED` - Code has expired (>10 minutes)
- `CODE_USED` - Code already used
- `TOO_MANY_ATTEMPTS` - Exceeded 5 attempts
- `INVALID_CODE` - Wrong code entered

### 3. Check Verification Status
**Endpoint:** `GET /api/auth/verify-code?email=user@example.com&purpose=registration`

**Response:**
```json
{
  "success": true,
  "hasCode": true,
  "data": {
    "isUsed": false,
    "isExpired": false,
    "expiresAt": "2024-12-16T10:10:00.000Z",
    "attemptsLeft": 5,
    "canRetry": true,
    "createdAt": "2024-12-16T10:00:00.000Z"
  }
}
```

## Integration with Registration Flow

### Step 1: After User Registration
After the user completes step 1 of registration (face verification, document upload, etc.), send them a verification code:

```javascript
// In your registration API
const result = await fetch('/api/auth/send-verification-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: userData.email,
    userUid: userData.uid,
    userName: `${userData.firstName} ${userData.lastName}`,
    purpose: 'registration'
  })
});
```

### Step 2: Code Entry Screen
Show a form for the user to enter the 6-digit code:

```javascript
const verifyCode = async (code) => {
  const result = await fetch('/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      code: code,
      purpose: 'registration'
    })
  });
  
  if (result.success) {
    // Code verified - proceed to next step
    redirectToNextStep();
  } else {
    // Show error message
    showError(result.message);
  }
};
```

## Email Template

The verification email includes:
- **Professional SevisPass branding**
- **Large, prominent 6-digit code**
- **Security warnings**
- **10-minute expiration notice**
- **Mobile-responsive design**

Sample code display:
```
┌─────────────────┐
│      123456     │
└─────────────────┘
```

## Security Features

1. **Rate Limiting:** 2-minute cooldown between code requests
2. **Attempt Limiting:** Maximum 5 verification attempts per code
3. **Time-based Expiration:** Codes expire after 10 minutes
4. **One-time Use:** Codes are marked as used after successful verification
5. **Automatic Cleanup:** Expired and used codes are automatically cleaned
6. **Input Validation:** Email format and code format validation

## Testing

### Test Email Template Only
```bash
curl -X GET "http://localhost:3000/api/test/email-verification?email=test@example.com&name=Test%20User"
```

### Test Complete Flow (Requires Database Setup)
```bash
# Test the complete verification flow
curl -X POST "http://localhost:3000/api/test/verification-flow" \
  -H "Content-Type: application/json" \
  -d '{"testEmail":"test@example.com","testName":"Test User"}'
```

### Manual Step-by-Step Testing
1. **Send code:** `POST /api/auth/send-verification-code`
2. **Check status:** `GET /api/auth/verify-code?email=...`
3. **Verify code:** `POST /api/auth/verify-code`

### Troubleshooting Database Issues
If you get column errors, check your database schema:
```sql
-- Check if columns exist with correct names
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('email_verified', 'email_verified_at', 'createdAt');
```

## Database Schema

### email_verification_codes table:
- `id` (Serial Primary Key)
- `email` (VARCHAR(255))
- `code` (VARCHAR(6))
- `user_uid` (VARCHAR(255), optional)
- `purpose` (VARCHAR(50))
- `is_used` (BOOLEAN)
- `expires_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `attempts` (INT)
- `max_attempts` (INT)

### users table additions:
- `email_verified` (BOOLEAN)
- `email_verified_at` (TIMESTAMP)

## Error Handling

The system provides detailed error messages for:
- Invalid email formats
- Expired codes
- Used codes
- Too many attempts
- Network errors
- Database errors

## Monitoring

Use the `verification_stats` view for monitoring:
```sql
SELECT * FROM verification_stats;
```

Shows statistics by purpose:
- Total codes generated
- Used codes
- Expired codes
- Active codes
- Average attempts

## Cleanup

Automatic cleanup runs when sending new codes. Manual cleanup:
```sql
SELECT cleanup_expired_verification_codes();
```

## Best Practices

1. Always validate email format before sending codes
2. Implement proper UI feedback for all error states
3. Show remaining attempts to users
4. Provide "resend code" functionality with rate limiting
5. Log verification attempts for security monitoring
6. Consider implementing CAPTCHA for repeated failures