import { NextRequest, NextResponse } from 'next/server';
import { withMobileAuth, AuthenticatedUser } from '@/lib/mobile-auth';

interface CredentialsResponse {
  success: boolean;
  credentials?: {
    sevispass: {
      id: string;
      name: string;
      nid: string;
      uid: string;
      verified: boolean;
      issuedDate: string;
      expiryDate: string;
      qrCode: string;
      verifiableCredential: any;
    };
    citypass?: {
      id: string;
      name: string;
      city: string;
      privileges: string[];
      issuedDate: string;
      expiryDate: string;
    };
    publicServantId?: {
      id: string;
      name: string;
      department: string;
      position: string;
      employeeId: string;
      issuedDate: string;
      expiryDate: string;
    };
  };
  message: string;
}

async function getCredentials(request: NextRequest, user: AuthenticatedUser) {
  try {

    // Generate SevisPass credential data
    const sevisPassCredential = {
      id: `sevispass-${user.uid}`,
      name: `${user.firstName} ${user.lastName}`,
      nid: user.nid,
      uid: user.uid,
      verified: true,
      issuedDate: user.createdAt || new Date().toISOString(),
      expiryDate: new Date(2030, 11, 31).toISOString(),
      qrCode: generateQRCodeData(user),
      verifiableCredential: await generateW3CCredential(user)
    };

    // For now, only SevisPass is implemented
    // CityPass and PublicServantId would be added based on user roles/eligibility
    const credentials = {
      sevispass: sevisPassCredential
      // citypass: undefined, // Would be populated if user has city pass
      // publicServantId: undefined, // Would be populated if user is a public servant
    };

    return NextResponse.json({
      success: true,
      credentials,
      message: 'Credentials retrieved successfully'
    } as CredentialsResponse);

  } catch (error) {
    console.error('Get credentials error:', error);
    
    return new NextResponse(JSON.stringify({
      success: false,
      message: 'Internal server error'
    } as CredentialsResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export const GET = withMobileAuth(getCredentials);

function generateQRCodeData(user: any) {
  return {
    type: "SevisPassVC",
    version: "1.0",
    deepLink: `seviswallet://import?type=vc&uid=${user.uid}&name=${encodeURIComponent(`${user.firstName} ${user.lastName}`)}&nric=${encodeURIComponent(user.nid)}`,
    verificationUrl: `https://sevispass.gov.sg/verify/${user.uid}`,
    metadata: {
      id: user.uid,
      name: `${user.firstName} ${user.lastName}`,
      nric: user.nid,
      platform: 'SevisPass',
      verified: true,
      timestamp: new Date().toISOString()
    }
  };
}

async function generateW3CCredential(user: any) {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://sevispass.gov.sg/contexts/identity/v1"
    ],
    "id": `https://sevispass.gov.sg/credentials/${user.uid}`,
    "type": ["VerifiableCredential", "SevisPassIdentityCredential"],
    "issuer": {
      "id": "did:sevispass:issuer:government",
      "name": "SevisPass Government Authority"
    },
    "issuanceDate": user.createdAt || new Date().toISOString(),
    "expirationDate": new Date(2030, 11, 31).toISOString(),
    "credentialSubject": {
      "id": `did:sevispass:${user.uid}`,
      "type": "SevisPassIdentity",
      "name": `${user.firstName} ${user.lastName}`,
      "nationalId": user.nid,
      "uid": user.uid,
      "verificationStatus": "VERIFIED",
      "issuingAuthority": "SevisPass Government",
      "dateIssued": user.createdAt || new Date().toISOString()
    },
    "credentialSchema": {
      "id": "https://sevispass.gov.sg/schemas/identity-credential/v1.0",
      "type": "JsonSchemaValidator2018"
    },
    "proof": {
      "type": "Ed25519Signature2020",
      "created": new Date().toISOString(),
      "verificationMethod": "did:sevispass:issuer:government#key-1",
      "proofPurpose": "assertionMethod",
      "proofValue": generateMockProof(user.uid, `${user.firstName} ${user.lastName}`, user.nid)
    }
  };
}

function generateMockProof(uid: string, name: string, nric: string): string {
  const data = `${uid}${name}${nric}${new Date().toISOString()}`;
  return Buffer.from(data).toString('base64').substring(0, 64);
}