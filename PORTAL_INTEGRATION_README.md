# Portal Integration API

This document describes the API endpoints created for portal integration and SSO (Single Sign-On) functionality.

## Overview

The portal integration API provides secure authentication and user information endpoints for external portal systems to authenticate users and retrieve their data.

## Endpoints

### 1. Portal Authentication
**POST** `/api/portal/auth`

Authenticates a user and returns a JWT token for portal access.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword",
  "portalId": "external-portal-id",
  "returnUrl": "https://portal.example.com/dashboard"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "user-uid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "nid": "123456789",
    "verified": true
  },
  "redirectUrl": "https://portal.example.com/dashboard",
  "message": "Authentication successful"
}
```

### 2. Token Validation
**POST** `/api/portal/validate`

Validates a JWT token and returns user information.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "user-uid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "nid": "123456789",
    "verified": true,
    "hasActiveAppointment": true
  },
  "message": "Token validated successfully"
}
```

### 3. User Information
**POST** `/api/portal/user-info`

Retrieves detailed user information including appointments.

**Request Body:**
```json
{
  "uid": "user-uid"
  // OR "email": "user@example.com"
  // OR "nid": "123456789"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "user-uid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "nid": "123456789",
    "phoneNumber": "+67512345678",
    "address": "Port Moresby, PNG",
    "verified": true,
    "appointments": [
      {
        "id": "apt-id",
        "date": "2024-01-15",
        "time": "10:00",
        "location": "Port Moresby Office",
        "status": "confirmed"
      }
    ]
  },
  "message": "User information retrieved successfully"
}
```

### 4. Single Sign-On (SSO)
**POST** `/api/portal/sso`

Handles SSO authentication and redirection.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "action": "login",
  "returnUrl": "https://portal.example.com/dashboard"
}
```

**GET** `/api/portal/sso?token=TOKEN&returnUrl=URL`

Direct SSO redirect endpoint for GET-based SSO flows.

### 5. Webhook Integration
**POST** `/api/portal/webhook`

Receives webhook events from external systems.

**Request Body:**
```json
{
  "event": "user.updated",
  "data": {
    "uid": "user-uid",
    "timestamp": "2024-01-15T10:00:00Z",
    "metadata": {
      "field": "value"
    }
  },
  "signature": "webhook-signature"
}
```

**Supported Events:**
- `user.updated` - User information has been updated
- `appointment.created` - New appointment has been created
- `appointment.cancelled` - Appointment has been cancelled

## Authentication

### JWT Token Structure
```json
{
  "uid": "user-uid",
  "email": "user@example.com",
  "portalId": "external-portal-id",
  "iat": 1642252800,
  "exp": 1642339200
}
```

### Environment Variables
Add these to your `.env.local`:

```env
JWT_SECRET=your-jwt-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

## Integration Examples

### JavaScript/Node.js Portal Integration
```javascript
// Authenticate user
const authResponse = await fetch('/api/portal/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password',
    portalId: 'my-portal'
  })
});

const { token, user } = await authResponse.json();

// Validate token later
const validateResponse = await fetch('/api/portal/validate', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ token })
});
```

### SSO Redirect Flow
```html
<!-- Portal login page -->
<form action="/api/portal/sso" method="get">
  <input type="hidden" name="token" value="JWT_TOKEN_HERE">
  <input type="hidden" name="returnUrl" value="https://portal.example.com/dashboard">
  <button type="submit">Login to SEVIS Portal</button>
</form>
```

## Security Considerations

1. **Token Expiry**: JWT tokens expire after 24 hours
2. **HTTPS Only**: Always use HTTPS in production
3. **Secret Management**: Keep JWT_SECRET secure and rotate regularly
4. **Input Validation**: All endpoints validate input data
5. **Rate Limiting**: Consider implementing rate limiting for production

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  // Additional error context may be included
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid credentials/token)
- `404` - Not Found (user/resource not found)
- `500` - Internal Server Error

## Testing

Use tools like Postman or curl to test the endpoints:

```bash
# Test authentication
curl -X POST http://localhost:3000/api/portal/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Test token validation
curl -X POST http://localhost:3000/api/portal/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"token":"YOUR_JWT_TOKEN"}'
```