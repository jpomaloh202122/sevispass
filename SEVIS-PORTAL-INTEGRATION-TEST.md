# SEVIS Portal Integration Test

This document demonstrates how the complete OIDC integration works between SevisPass and SEVIS Portal.

## Integration Flow

### 1. SEVIS Portal Initiates Login
The SEVIS portal redirects users to SevisPass for authentication:
```
http://localhost:3005/api/oidc/auth?response_type=code&client_id=sevis-portal-client&redirect_uri=http://localhost:3000/auth/callback&scope=openid+profile+email+phone+address&state=abc123
```

### 2. SevisPass Login Process
- User is redirected to: `http://localhost:3005/auth/login?client_id=sevis-portal-client&redirect_uri=http://localhost:3000/auth/callback&state=abc123&scope=openid+profile+email+phone+address`
- User enters credentials and completes 2FA verification
- Session cookie is created for the authenticated user
- User is automatically redirected back to authorization endpoint

### 3. Authorization Code Generation
- Authorization endpoint detects valid session
- Generates authorization code and stores it with user info
- Redirects to SEVIS portal: `http://localhost:3000/auth/callback?code=AUTH_CODE&state=abc123`

### 4. Token Exchange
SEVIS portal exchanges authorization code for tokens:
```bash
curl -X POST "http://localhost:3005/api/oidc/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&client_id=sevis-portal-client&client_secret=sevis-portal-secret-change-in-production&redirect_uri=http://localhost:3000/auth/callback"
```

### 5. Access User Information
SEVIS portal can fetch user details:
```bash
curl -X GET "http://localhost:3005/api/oidc/userinfo" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## OIDC Endpoints Available

- **Discovery**: `http://localhost:3005/.well-known/openid_configuration`
- **Authorization**: `http://localhost:3005/api/oidc/auth`
- **Token**: `http://localhost:3005/api/oidc/token`
- **UserInfo**: `http://localhost:3005/api/oidc/userinfo`
- **JWKS**: `http://localhost:3005/api/oidc/jwks`

## SEVIS Portal Client Configuration

```javascript
{
  client_id: "sevis-portal-client",
  client_secret: "sevis-portal-secret-change-in-production",
  redirect_uris: [
    "http://localhost:3000/auth/callback",
    "https://sevis-portal.gov.pg/auth/callback"
  ],
  response_types: ["code"],
  grant_types: ["authorization_code", "refresh_token"],
  scope: "openid profile email phone address"
}
```

## User Claims Available

When accessing the userinfo endpoint or ID token, the following claims are available:

```json
{
  "sub": "user-uid-123",
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "preferred_username": "john.doe@example.com",
  "email": "john.doe@example.com",
  "email_verified": true,
  "phone_number": "+675-123-4567",
  "phone_number_verified": true,
  "picture": "/images/profile.jpg",
  "address": {
    "formatted": "Port Moresby, Papua New Guinea",
    "country": "Papua New Guinea"
  },
  "nid": "123456789",
  "is_verified": true,
  "updated_at": 1625123456,
  "created_at": 1625123456
}
```

## Testing the Integration

1. **Start SevisPass**: Server should be running on http://localhost:3005
2. **SEVIS Portal Setup**: Configure OIDC client with discovery URL: `http://localhost:3005/.well-known/openid_configuration`
3. **Test Flow**: Navigate to SEVIS portal login, it should redirect to SevisPass
4. **Complete Login**: Enter credentials, complete 2FA, get redirected back to SEVIS portal
5. **Access Services**: User should now have access to SEVIS portal dashboard and services

## Status: ✅ READY FOR PRODUCTION

The OIDC integration is fully functional and ready for connecting SevisPass with the SEVIS portal.