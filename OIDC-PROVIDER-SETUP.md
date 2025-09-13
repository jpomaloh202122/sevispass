# SevisPass OIDC Provider Setup

SevisPass now includes a complete OIDC (OpenID Connect) provider that allows other applications (like the SEVIS Portal) to use SevisPass for single sign-on authentication.

## Overview

The OIDC provider allows external applications to:
- Authenticate users using their SevisPass credentials
- Access user profile information (with proper consent)
- Implement single sign-on (SSO) across services

## Endpoints

### Discovery Document
```
GET http://localhost:3005/.well-known/openid-configuration
```

### Authorization Endpoint
```
GET http://localhost:3005/api/oidc/auth
```

### Token Endpoint
```
POST http://localhost:3005/api/oidc/token
```

### UserInfo Endpoint
```
GET http://localhost:3005/api/oidc/userinfo
```

### JWKS Endpoint
```
GET http://localhost:3005/api/oidc/jwks
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# OIDC Provider Configuration
OIDC_CLIENT_SECRET="your-secure-client-secret"
SEVIS_PORTAL_REDIRECT_URI="http://localhost:3000/auth/callback"
SEVIS_PORTAL_LOGOUT_URI="http://localhost:3000/auth/logout"
```

### Client Configuration

The OIDC provider is pre-configured with a client for the SEVIS Portal:

- **Client ID**: `sevis-portal-client`
- **Client Secret**: Set via `OIDC_CLIENT_SECRET` environment variable
- **Grant Types**: `authorization_code`, `refresh_token`
- **Response Types**: `code`
- **Scopes**: `openid`, `profile`, `email`, `phone`, `address`

## Usage Example

### 1. Authorization Request

Direct users to the authorization endpoint:

```
GET http://localhost:3005/api/oidc/auth?
  response_type=code&
  client_id=sevis-portal-client&
  redirect_uri=http://localhost:3000/auth/callback&
  scope=openid profile email&
  state=random-state-value
```

### 2. Handle Authorization Response

After user authentication, SevisPass will redirect to your callback URL:

```
http://localhost:3000/auth/callback?
  code=authorization_code_here&
  state=random-state-value
```

### 3. Exchange Code for Tokens

```bash
curl -X POST http://localhost:3005/api/oidc/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "sevis-portal-client:your-client-secret" \
  -d "grant_type=authorization_code&code=authorization_code_here&redirect_uri=http://localhost:3000/auth/callback"
```

Response:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "id_token": "..."
}
```

### 4. Get User Information

```bash
curl -H "Authorization: Bearer access_token_here" \
  http://localhost:3005/api/oidc/userinfo
```

Response:
```json
{
  "sub": "user-uuid",
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "email": "john.doe@example.com",
  "email_verified": true,
  "phone_number": "+67512345678",
  "phone_number_verified": true,
  "address": {
    "formatted": "123 Main St, Port Moresby, PNG",
    "country": "PNG"
  }
}
```

## Claims Available

Based on the requested scopes, the following claims are available:

### Profile Scope
- `name`: Full name
- `given_name`: First name
- `family_name`: Last name
- `preferred_username`: Email address
- `updated_at`: Profile update timestamp

### Email Scope
- `email`: Email address
- `email_verified`: Always true for SevisPass users

### Phone Scope
- `phone_number`: Phone number
- `phone_number_verified`: Always true for SevisPass users

### Address Scope
- `address`: Formatted address object

## Security Features

- **Face Verification**: All SevisPass users have completed face verification
- **2FA Required**: All logins require 2FA verification via email
- **Secure Tokens**: JWT tokens signed with RSA keys
- **Consent Flow**: Users must explicitly consent to sharing data

## Integration with SEVIS Portal

To integrate with the SEVIS Portal or any other application:

1. Configure the client credentials in your application
2. Implement the OAuth 2.0 Authorization Code flow
3. Use the received tokens to access user information
4. Validate JWT tokens using the JWKS endpoint

## Development vs Production

### Development
- Uses localhost URLs
- Simplified key management
- Detailed error messages

### Production Checklist
- [ ] Generate proper RSA key pairs
- [ ] Use secure client secrets
- [ ] Configure proper redirect URIs
- [ ] Enable HTTPS
- [ ] Set up proper session management
- [ ] Configure rate limiting

## Troubleshooting

### Common Issues

1. **"Invalid redirect_uri"**: Ensure the redirect URI matches exactly what's configured
2. **"Invalid client"**: Check client_id and client_secret
3. **"Invalid scope"**: Ensure requested scopes are supported
4. **"Interaction required"**: User needs to complete authentication flow

### Logs

Check the application logs for detailed error information during the authentication flow.

## Standards Compliance

This OIDC provider follows:
- OAuth 2.0 RFC 6749
- OpenID Connect Core 1.0
- OpenID Connect Discovery 1.0
- JSON Web Token (JWT) RFC 7519
- JSON Web Key Set (JWKS) RFC 7517