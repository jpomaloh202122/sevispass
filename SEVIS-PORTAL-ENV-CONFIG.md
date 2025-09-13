# SEVIS Portal Environment Configuration

## Required Environment Variables for SEVIS Portal

Add these to your SEVIS portal `.env` file:

```bash
# OIDC Provider Configuration - SevisPass Integration
OIDC_ISSUER=http://localhost:3005
OIDC_CLIENT_ID=sevis-portal-client
OIDC_CLIENT_SECRET=sevis-portal-secret-change-in-production
OIDC_REDIRECT_URI=http://localhost:3000/auth/callback
OIDC_LOGOUT_URI=http://localhost:3000/auth/logout

# Discovery endpoint (automatic configuration)
OIDC_DISCOVERY_URL=http://localhost:3005/.well-known/openid_configuration

# Manual endpoint configuration (if discovery not supported)
OIDC_AUTHORIZATION_ENDPOINT=http://localhost:3005/api/oidc/auth
OIDC_TOKEN_ENDPOINT=http://localhost:3005/api/oidc/token
OIDC_USERINFO_ENDPOINT=http://localhost:3005/api/oidc/userinfo
OIDC_JWKS_ENDPOINT=http://localhost:3005/api/oidc/jwks
OIDC_END_SESSION_ENDPOINT=http://localhost:3005/api/oidc/session/end

# Scopes and response types
OIDC_SCOPE=openid profile email phone address
OIDC_RESPONSE_TYPE=code
OIDC_GRANT_TYPE=authorization_code

# Security settings
OIDC_CODE_CHALLENGE_METHOD=S256
OIDC_SUBJECT_TYPE=public
OIDC_ID_TOKEN_SIGNING_ALG=RS256
```

## Production Configuration

For production deployment, update URLs:

```bash
# Production URLs
OIDC_ISSUER=https://sevispass.gov.pg
OIDC_DISCOVERY_URL=https://sevispass.gov.pg/.well-known/openid_configuration
OIDC_REDIRECT_URI=https://sevis-portal.gov.pg/auth/callback
OIDC_LOGOUT_URI=https://sevis-portal.gov.pg/auth/logout

# Keep same client credentials
OIDC_CLIENT_ID=sevis-portal-client
OIDC_CLIENT_SECRET=sevis-portal-secret-change-in-production
```

## Integration Flow URLs

### 1. Login Initiation
Direct users to:
```
http://localhost:3005/api/oidc/auth?response_type=code&client_id=sevis-portal-client&redirect_uri=http://localhost:3000/auth/callback&scope=openid+profile+email+phone+address&state=RANDOM_STATE
```

### 2. Token Exchange
After receiving authorization code, supports both content types:

**Form-urlencoded (OIDC standard):**
```bash
curl -X POST "http://localhost:3005/api/oidc/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&client_id=sevis-portal-client&client_secret=sevis-portal-secret-change-in-production&redirect_uri=http://localhost:3000/auth/callback"
```

**JSON (alternative):**
```bash
curl -X POST "http://localhost:3005/api/oidc/token" \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"authorization_code","code":"AUTH_CODE","client_id":"sevis-portal-client","client_secret":"sevis-portal-secret-change-in-production","redirect_uri":"http://localhost:3000/auth/callback"}'
```

### 3. User Information
With access token:
```bash
curl -X GET "http://localhost:3005/api/oidc/userinfo" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Available User Claims

When successfully authenticated, you'll receive:

```json
{
  "sub": "user-unique-id",
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

## Framework-Specific Examples

### Next.js with NextAuth
```javascript
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth'

export default NextAuth({
  providers: [
    {
      id: "sevispass",
      name: "SevisPass",
      type: "oauth",
      wellKnown: "http://localhost:3005/.well-known/openid_configuration",
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          nid: profile.nid,
          phone: profile.phone_number,
          verified: profile.is_verified
        }
      }
    }
  ]
})
```

### Express.js with Passport
```javascript
const passport = require('passport');
const { Strategy } = require('passport-openidconnect');

passport.use('sevispass', new Strategy({
  issuer: 'http://localhost:3005',
  authorizationURL: 'http://localhost:3005/api/oidc/auth',
  tokenURL: 'http://localhost:3005/api/oidc/token',
  userInfoURL: 'http://localhost:3005/api/oidc/userinfo',
  clientID: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  callbackURL: 'http://localhost:3002/auth/callback',
  scope: ['openid', 'profile', 'email', 'phone', 'address']
}, (issuer, profile, done) => {
  return done(null, profile);
}));
```

## Testing the Integration

1. **Start SEVIS Portal**: Ensure it's running on http://localhost:3000
2. **Start SevisPass**: Ensure it's running on http://localhost:3005  
3. **Test Login Flow**: Navigate to SEVIS portal login
4. **Verify Redirect**: Should redirect to SevisPass login
5. **Complete 2FA**: Enter credentials and 2FA code
6. **Confirm Redirect**: Should return to SEVIS portal with user session

## Troubleshooting

### Common Issues:
- **CORS Errors**: Add SevisPass URL to CORS whitelist
- **Invalid Client**: Verify client_id matches "sevis-portal-client"
- **Redirect Mismatch**: Ensure redirect_uri exactly matches configured URI
- **Token Validation**: Check client_secret in token exchange

### Debug Mode:
Enable detailed logging by setting:
```bash
DEBUG=oidc*
```

## Status: ✅ Ready for Implementation

All SevisPass endpoints are functional and ready to receive OIDC requests from SEVIS portal.