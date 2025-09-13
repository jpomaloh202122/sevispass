# SevisPass Mobile API Documentation

This document describes the mobile API endpoints for the SevisPass application, designed for integration with mobile applications.

## Base URL
```
https://your-domain.com/api/mobile
```

## Authentication

The mobile API uses JWT (JSON Web Tokens) for authentication. After successful login, you'll receive:
- **Access Token**: Short-lived token (1 hour) for API requests
- **Refresh Token**: Long-lived token (7 days) for getting new access tokens

### Headers
All authenticated requests must include:
```
Authorization: Bearer <access_token>
```

## API Endpoints

### 1. Login

**POST** `/api/mobile/auth/login`

Login with email and password, initiating 2FA process.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userPassword123",
  "deviceId": "optional-device-identifier"
}
```

**Response:**
```json
{
  "success": true,
  "requires2FA": true,
  "uid": "user-unique-id",
  "message": "Verification code sent to your email. Please check your inbox and enter the 6-digit code to complete login."
}
```

### 2. Verify 2FA Code

**POST** `/api/mobile/auth/verify-2fa`

Complete login by verifying the 2FA code sent via email.

**Request Body:**
```json
{
  "uid": "user-unique-id",
  "code": "123456",
  "deviceId": "optional-device-identifier"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "user-unique-id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "nid": "123456789",
    "phoneNumber": "+67512345678",
    "address": "123 Main St, City",
    "profileImage": "base64-encoded-image-or-url"
  },
  "message": "Login successful"
}
```

### 3. Refresh Token

**POST** `/api/mobile/auth/refresh`

Get a new access token using the refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "optional-device-identifier"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Token refreshed successfully"
}
```

### 4. Get User Profile

**GET** `/api/mobile/profile`

Get the authenticated user's profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "user-unique-id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "nid": "123456789",
    "phoneNumber": "+67512345678",
    "address": "123 Main St, City",
    "profileImage": "base64-encoded-image-or-url",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Profile retrieved successfully"
}
```

### 5. Get All Credentials

**GET** `/api/mobile/credentials`

Get all verifiable credentials for the authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "credentials": {
    "sevispass": {
      "id": "sevispass-user-unique-id",
      "name": "John Doe",
      "nid": "123456789",
      "uid": "user-unique-id",
      "verified": true,
      "issuedDate": "2024-01-01T00:00:00.000Z",
      "expiryDate": "2030-12-31T00:00:00.000Z",
      "qrCode": {
        "type": "SevisPassVC",
        "version": "1.0",
        "deepLink": "seviswallet://import?type=vc&uid=...",
        "verificationUrl": "https://sevispass.gov.sg/verify/...",
        "metadata": { ... }
      },
      "verifiableCredential": {
        "@context": ["https://www.w3.org/2018/credentials/v1", ...],
        "id": "https://sevispass.gov.sg/credentials/...",
        "type": ["VerifiableCredential", "SevisPassIdentityCredential"],
        // ... W3C Verifiable Credential format
      }
    }
  },
  "message": "Credentials retrieved successfully"
}
```

### 6. Get Specific Credential

**GET** `/api/mobile/credentials/{type}`

Get details for a specific credential type.

**Parameters:**
- `type`: Credential type (`sevispass`, `citypass`, `publicservantid`)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response for SevisPass:**
```json
{
  "success": true,
  "credential": {
    "id": "sevispass-user-unique-id",
    "name": "John Doe",
    "nid": "123456789",
    "uid": "user-unique-id",
    "email": "user@example.com",
    "phoneNumber": "+67512345678",
    "address": "123 Main St, City",
    "verified": true,
    "issuedDate": "2024-01-01T00:00:00.000Z",
    "expiryDate": "2030-12-31T00:00:00.000Z",
    "profileImage": "base64-encoded-image-or-url",
    "verifiableCredential": { ... },
    "qrCodeData": {
      "type": "SevisPassVC",
      "version": "1.0",
      "deepLink": "seviswallet://import?type=vc&uid=...",
      "verificationUrl": "https://sevispass.gov.sg/verify/...",
      "credential": { ... }
    }
  },
  "downloadUrl": "data:application/json;charset=utf-8,...",
  "message": "Credential retrieved successfully"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found (user/credential not found)
- `500` - Internal Server Error

## Authentication Flow

1. **Login**: POST to `/api/mobile/auth/login` with email/password
2. **2FA**: POST to `/api/mobile/auth/verify-2fa` with the code sent via email
3. **Store Tokens**: Save both access and refresh tokens securely
4. **API Calls**: Include access token in Authorization header
5. **Token Refresh**: Use refresh token when access token expires

## Security Considerations

- Store tokens securely (encrypted storage, not plain text)
- Implement proper token refresh logic
- Handle token expiration gracefully
- Use HTTPS for all API calls
- Validate SSL certificates
- Implement proper error handling

## Credential Types

### SevisPass (Available)
Digital identity credential with user information and W3C Verifiable Credential format.

### CityPass (Coming Soon)
City-specific privileges and access rights.

### PublicServantID (Coming Soon)
Government employee identification and role-based credentials.

## W3C Verifiable Credentials

All credentials follow the W3C Verifiable Credentials standard:
- Standard JSON-LD context
- Cryptographic proofs (mock implementation for now)
- Expiration dates
- Issuer information
- Subject data

## Development Notes

- Development mode bypasses email 2FA failures for testing
- Mock cryptographic proofs are used (production would use real signatures)
- JWT_SECRET environment variable should be set for production
- Profile images are returned as base64 strings or URLs