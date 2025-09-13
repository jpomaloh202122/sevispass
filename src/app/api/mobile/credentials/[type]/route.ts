import { NextRequest, NextResponse } from 'next/server';
import { withMobileAuth, AuthenticatedUser } from '@/lib/mobile-auth';

interface CredentialDetailResponse {
  success: boolean;
  credential?: any;
  downloadUrl?: string;
  message: string;
}

async function getCredentialDetail(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: { params: { type: string } }
) {
  try {
    const credentialType = params.type;

    // Validate credential type
    if (!['sevispass', 'citypass', 'publicservantid'].includes(credentialType)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid credential type. Supported types: sevispass, citypass, publicservantid'
      } as CredentialDetailResponse, { status: 400 });
    }

    let credential;
    let downloadUrl;

    switch (credentialType) {
      case 'sevispass':
        credential = await generateSevisPassCredential(user);
        downloadUrl = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(credential.verifiableCredential))}`;
        break;
      
      case 'citypass':
        // TODO: Implement city pass generation based on user eligibility
        return NextResponse.json({
          success: false,
          message: 'City Pass not available for this user'
        } as CredentialDetailResponse, { status: 404 });
      
      case 'publicservantid':
        // TODO: Implement public servant ID generation based on user role
        return NextResponse.json({
          success: false,
          message: 'Public Servant ID not available for this user'
        } as CredentialDetailResponse, { status: 404 });
      
      default:
        return NextResponse.json({
          success: false,
          message: 'Unsupported credential type'
        } as CredentialDetailResponse, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      credential,
      downloadUrl,
      message: 'Credential retrieved successfully'
    } as CredentialDetailResponse);

  } catch (error) {
    console.error('Get credential detail error:', error);
    
    return new NextResponse(JSON.stringify({
      success: false,
      message: 'Internal server error'
    } as CredentialDetailResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export const GET = withMobileAuth(getCredentialDetail);

async function generateSevisPassCredential(user: any) {
  const verifiableCredential = {
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
      "email": user.email,
      "phoneNumber": user.phoneNumber,
      "address": user.address,
      "verificationStatus": "VERIFIED",
      "issuingAuthority": "SevisPass Government",
      "dateIssued": user.createdAt || new Date().toISOString(),
      "profileImage": user.profileImage
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

  return {
    id: `sevispass-${user.uid}`,
    name: `${user.firstName} ${user.lastName}`,
    nid: user.nid,
    uid: user.uid,
    email: user.email,
    phoneNumber: user.phoneNumber,
    address: user.address,
    verified: true,
    issuedDate: user.createdAt || new Date().toISOString(),
    expiryDate: new Date(2030, 11, 31).toISOString(),
    profileImage: user.profileImage,
    verifiableCredential,
    qrCodeData: {
      type: "SevisPassVC",
      version: "1.0",
      deepLink: `seviswallet://import?type=vc&uid=${user.uid}&name=${encodeURIComponent(`${user.firstName} ${user.lastName}`)}&nric=${encodeURIComponent(user.nid)}`,
      verificationUrl: `https://sevispass.gov.sg/verify/${user.uid}`,
      credential: verifiableCredential
    }
  };
}

function generateMockProof(uid: string, name: string, nric: string): string {
  const data = `${uid}${name}${nric}${new Date().toISOString()}`;
  return Buffer.from(data).toString('base64').substring(0, 64);
}