# SEVIS Portal - SevisPass OIDC Integration

Complete implementation of the Papua New Guinea Government Services Portal with SevisPass OIDC authentication and Public Servant Pass (PSP) system.

## 🏛️ Features

### Authentication
- **SevisPass OIDC Integration**: Single sign-on with face verification and 2FA
- **Secure Sessions**: JWT-based session management with PKCE
- **Permission System**: Role-based access control for different user types

### Public Servant Pass (PSP)
- **Application System**: Digital credential application for government employees
- **DPM Approval Workflow**: Department of Personal Management vetting process
- **QR Code Generation**: Scannable digital passes with UUID
- **Pass Verification**: Public endpoint to verify PSP authenticity

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd sevis-portal-integration
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start SEVIS Portal
```bash
npm run dev
```

The portal will be available at `http://localhost:3001`

## 🔧 Configuration

### Required Environment Variables

```env
# OIDC Provider Settings
OIDC_ISSUER=http://localhost:3003
OIDC_CLIENT_ID=sevis-portal-client
OIDC_CLIENT_SECRET=sevis-portal-secret-change-in-production
OIDC_REDIRECT_URI=http://localhost:3001/auth/callback

# Server Configuration
PORT=3001
NODE_ENV=development
```

### SevisPass OIDC Provider Setup

Ensure your SevisPass instance is configured with:
```env
# In SevisPass .env
OIDC_CLIENT_SECRET="sevis-portal-secret-change-in-production"
SEVIS_PORTAL_REDIRECT_URI="http://localhost:3001/auth/callback"
SEVIS_PORTAL_LOGOUT_URI="http://localhost:3001/auth/logout"
```

## 📡 API Endpoints

### Authentication
- `GET /auth/login` - Initiate OIDC login
- `GET /auth/callback` - Handle OIDC callback
- `POST /auth/logout` - Logout user
- `GET /auth/user` - Get current user info
- `GET /auth/status` - Check authentication status

### Dashboard
- `GET /dashboard` - Main user dashboard
- `GET /health` - System health check

### Public Servant Pass
- `GET /psp/dashboard` - PSP dashboard
- `POST /psp/apply` - Submit PSP application
- `GET /psp/application/:id` - Get application details
- `GET /psp/pass` - Get user's PSP (if approved)
- `GET /psp/pass/download` - Download PSP QR code

### PSP Administration (DPM)
- `GET /psp/admin/applications` - List all applications
- `POST /psp/admin/applications/:id/approve` - Approve application
- `POST /psp/admin/applications/:id/reject` - Reject application

### PSP Verification (Public)
- `GET /psp/verify/:uuid` - Verify PSP by UUID

## 🔐 Authentication Flow

1. **User Access**: User visits `/auth/login`
2. **OIDC Redirect**: Portal redirects to SevisPass OIDC provider
3. **SevisPass Auth**: User authenticates with face verification + 2FA
4. **Authorization**: User consents to share data with portal
5. **Callback**: SevisPass redirects to `/auth/callback` with code
6. **Token Exchange**: Portal exchanges code for access tokens
7. **User Session**: Portal creates authenticated session
8. **Dashboard Access**: User can access portal features

## 🏛️ Public Servant Pass Flow

### Application Process
1. **Login Required**: User must authenticate with SevisPass
2. **Application Form**: User fills Employee ID and Government Email
3. **Submit to DPM**: Application sent to Department of Personal Management
4. **DPM Review**: DPM staff approve or reject application
5. **Notification**: Applicant notified via email and portal
6. **Pass Issuance**: If approved, UUID and QR code generated

### Pass Verification
- **QR Code Scan**: Anyone can scan the QR code
- **UUID Verification**: System verifies UUID against database
- **Public Info**: Returns holder name, department, position (no sensitive data)

## 🛠️ Development

### Project Structure
```
sevis-portal-integration/
├── lib/
│   └── oidc-client.js          # OIDC client implementation
├── middleware/
│   └── auth.js                 # Authentication middleware
├── routes/
│   ├── auth.js                 # Authentication routes
│   └── psp.js                  # Public Servant Pass routes
├── app.js                      # Main Express application
├── package.json                # Dependencies
├── .env.example               # Environment template
└── README.md                  # This file
```

### Key Components

**OIDC Client (`lib/oidc-client.js`)**
- Implements full OAuth 2.0 + OpenID Connect flow
- PKCE support for security
- Token management and validation

**Auth Middleware (`middleware/auth.js`)**
- Session management
- Permission checking
- User context injection

**PSP Routes (`routes/psp.js`)**
- Complete PSP application system
- DPM admin interface
- QR code generation
- Pass verification

## 🔍 Testing

### Manual Testing

1. **Start SevisPass OIDC Provider**:
   ```bash
   cd sevis-pass
   npm run dev  # Should be running on port 3003
   ```

2. **Start SEVIS Portal**:
   ```bash
   cd sevis-portal-integration
   npm run dev  # Will run on port 3001
   ```

3. **Test Authentication**:
   - Visit `http://localhost:3001/auth/login`
   - Should redirect to SevisPass login
   - Complete authentication with face verification + 2FA
   - Should redirect back to portal dashboard

4. **Test PSP Application**:
   - Visit `http://localhost:3001/psp/dashboard`
   - Submit PSP application
   - Use DPM admin endpoints to approve/reject

### API Testing with curl

```bash
# Check system health
curl http://localhost:3001/health

# Get authentication status
curl -b cookies.txt http://localhost:3001/auth/status

# Start login flow
curl -c cookies.txt http://localhost:3001/auth/login

# Apply for PSP (after authentication)
curl -X POST -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"employeeId":"EMP001","governmentEmail":"john.doe@dpm.gov.pg"}' \
  http://localhost:3001/psp/apply

# Verify PSP (public endpoint)
curl http://localhost:3001/psp/verify/YOUR-PSP-UUID-HERE
```

## 🚀 Production Deployment

### Environment Setup
- Use proper SSL certificates (HTTPS)
- Set secure session secrets
- Configure proper CORS origins
- Use production database (PostgreSQL/MySQL)
- Set up Redis for session storage
- Configure email service for notifications

### Security Checklist
- [ ] Change all default secrets
- [ ] Enable HTTPS everywhere
- [ ] Configure secure cookies
- [ ] Set proper CORS policies
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular security audits

### Database Schema (for production)
```sql
-- Applications table
CREATE TABLE psp_applications (
  id UUID PRIMARY KEY,
  user_sub VARCHAR(255) NOT NULL,
  employee_id VARCHAR(100) NOT NULL,
  government_email VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  position VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255),
  rejection_reason TEXT
);

-- Approved passes table
CREATE TABLE psp_passes (
  uuid UUID PRIMARY KEY,
  user_sub VARCHAR(255) UNIQUE NOT NULL,
  holder_name VARCHAR(255) NOT NULL,
  employee_id VARCHAR(100) NOT NULL,
  department VARCHAR(255),
  position VARCHAR(255),
  issued_at TIMESTAMP DEFAULT NOW(),
  issued_by VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active'
);
```

## 📞 Support

For technical support or integration questions:
- Create an issue in the repository
- Contact the development team
- Review the SevisPass OIDC documentation

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.