# Digital ID Core Stack

A comprehensive, modular digital identity platform built from the SevisPass implementation. This stack provides all the essential components for building secure digital identity systems.

## 🏗️ Architecture Overview

The Digital ID Core Stack is designed as a collection of independent, reusable modules that can be integrated into any digital identity system.

```
┌─────────────────────────────────────────────────────────────┐
│                    Digital ID Core Stack                    │
├─────────────────────────────────────────────────────────────┤
│  API Gateway & SDK  │  Authentication  │  Verification     │
│  - REST APIs        │  - OIDC Provider │  - Biometric      │
│  - GraphQL          │  - JWT Tokens    │  - Document OCR   │
│  - WebSocket        │  - 2FA/MFA       │  - Liveness       │
│  - SDK Libraries    │  - Mobile Auth   │  - Duplicate Det. │
├─────────────────────────────────────────────────────────────┤
│  Credential Mgmt    │  Storage & DB    │  Security & Audit │
│  - W3C Credentials  │  - User Data     │  - Encryption     │
│  - QR Codes         │  - Biometric DB  │  - Audit Logs     │
│  - Digital Wallet   │  - Document Store│  - Compliance     │
│  - Issuance/Verify  │  - Session Mgmt  │  - Rate Limiting  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL or Supabase
- AWS Account (for biometric verification)
- Redis (for session management)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd digital-id-core-stack

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:setup

# Start the development server
npm run dev
```

## 📦 Core Modules

### 1. Authentication Module (`/modules/auth`)
- **OIDC Provider**: Complete OpenID Connect implementation
- **JWT Management**: Token generation, validation, refresh
- **2FA/MFA**: Email, SMS, TOTP support
- **Mobile Authentication**: Device-based auth with biometrics
- **Session Management**: Secure session handling

### 2. Verification Module (`/modules/verification`)
- **Biometric Verification**: Face comparison using AWS Rekognition
- **Document Validation**: OCR and document verification
- **Liveness Detection**: Anti-spoofing measures
- **Duplicate Detection**: Advanced duplicate detection algorithms

### 3. Credential Module (`/modules/credentials`)
- **W3C Verifiable Credentials**: Standards-compliant credential issuance
- **QR Code Generation**: Secure QR codes for credential sharing
- **Digital Wallet**: Credential storage and management
- **Credential Verification**: Public verification endpoints

### 4. API Gateway (`/modules/api-gateway`)
- **REST APIs**: Comprehensive REST API endpoints
- **GraphQL**: Flexible data querying
- **WebSocket**: Real-time updates
- **Rate Limiting**: API protection and throttling

### 5. Storage Module (`/modules/storage`)
- **User Database**: User profile and authentication data
- **Biometric Storage**: Secure biometric data storage
- **Document Storage**: Encrypted document storage
- **Audit Logs**: Comprehensive audit trail

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/digital_id
REDIS_URL=redis://localhost:6379

# AWS Services
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-2

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# OIDC Configuration
OIDC_ISSUER=https://your-domain.com
OIDC_CLIENT_ID=your_client_id
OIDC_CLIENT_SECRET=your_client_secret

# Email Service
EMAIL_SERVICE_API_KEY=your_email_api_key
EMAIL_FROM=noreply@your-domain.com

# Security
ENCRYPTION_KEY=your_encryption_key
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

## 📚 API Documentation

### Authentication Endpoints

```bash
# OIDC Discovery
GET /.well-known/openid-configuration

# Authorization
GET /api/oidc/auth?response_type=code&client_id=...

# Token Exchange
POST /api/oidc/token

# User Info
GET /api/oidc/me

# Mobile Authentication
POST /api/mobile/auth/login
POST /api/mobile/auth/verify-2fa
POST /api/mobile/auth/refresh
```

### Verification Endpoints

```bash
# Face Verification
POST /api/verification/face

# Document Validation
POST /api/verification/document

# Duplicate Check
POST /api/verification/duplicate-check
```

### Credential Endpoints

```bash
# Issue Credential
POST /api/credentials/issue

# Verify Credential
GET /api/credentials/verify/{credentialId}

# Get User Credentials
GET /api/credentials/user/{userId}
```

## 🛡️ Security Features

- **End-to-End Encryption**: All sensitive data encrypted
- **Biometric Security**: AWS Rekognition for face verification
- **Document Security**: AWS Textract for document validation
- **Rate Limiting**: API protection against abuse
- **Audit Logging**: Comprehensive audit trail
- **Compliance**: GDPR, SOC 2, and other standards ready

## 🔌 Integration

### SDK Usage

```javascript
import { DigitalIDClient } from '@digital-id/core-sdk';

const client = new DigitalIDClient({
  baseUrl: 'https://your-api.com',
  apiKey: 'your-api-key'
});

// Authenticate user
const authResult = await client.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Verify face
const verification = await client.verification.verifyFace({
  sourceImage: sourceImageBuffer,
  targetImage: targetImageBuffer
});

// Issue credential
const credential = await client.credentials.issue({
  userId: 'user-id',
  credentialType: 'identity',
  data: { /* credential data */ }
});
```

### Portal Integration

```javascript
// OIDC Integration
const oidcConfig = {
  issuer: 'https://your-oidc-provider.com',
  clientId: 'your-client-id',
  redirectUri: 'https://your-portal.com/callback'
};

// SSO Login
window.location.href = `${oidcConfig.issuer}/auth?client_id=${oidcConfig.clientId}&redirect_uri=${oidcConfig.redirectUri}`;
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Kubernetes Deployment

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/
```

### Cloud Deployment

- **AWS**: ECS, EKS, Lambda
- **Google Cloud**: Cloud Run, GKE
- **Azure**: Container Instances, AKS

## 📊 Monitoring & Analytics

- **Health Checks**: Built-in health monitoring
- **Metrics**: Prometheus-compatible metrics
- **Logging**: Structured logging with correlation IDs
- **Alerting**: Integration with monitoring systems

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Documentation: [docs.digital-id-stack.com](https://docs.digital-id-stack.com)
- Issues: [GitHub Issues](https://github.com/your-org/digital-id-core-stack/issues)
- Community: [Discord](https://discord.gg/digital-id-stack)

## 🗺️ Roadmap

- [ ] Blockchain integration for credential verification
- [ ] Advanced biometric modalities (fingerprint, iris)
- [ ] Multi-language support
- [ ] Mobile SDKs (React Native, Flutter)
- [ ] Enterprise SSO integrations
- [ ] Compliance certifications (ISO 27001, SOC 2)

