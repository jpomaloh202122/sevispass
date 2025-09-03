import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { uid, name, nric, type } = await request.json();

    if (!uid || !name || !nric) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, name, nric' },
        { status: 400 }
      );
    }

    if (type === 'seviswallet') {
      return await generateSevisWalletVC(uid, name, nric);
    }

    return NextResponse.json(
      { error: 'Invalid pass type. Use "seviswallet"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating wallet pass:', error);
    return NextResponse.json(
      { error: 'Failed to generate wallet pass' },
      { status: 500 }
    );
  }
}

async function generateSevisWalletVC(uid: string, name: string, nric: string) {
  try {
    // Create W3C Verifiable Credential for SevisWallet
    const verifiableCredential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://sevispass.gov.sg/contexts/identity/v1"
      ],
      "id": `https://sevispass.gov.sg/credentials/${uid}`,
      "type": ["VerifiableCredential", "SevisPassIdentityCredential"],
      "issuer": {
        "id": "did:sevispass:issuer:government",
        "name": "SevisPass Government Authority"
      },
      "issuanceDate": new Date().toISOString(),
      "expirationDate": new Date(2030, 11, 31).toISOString(),
      "credentialSubject": {
        "id": `did:sevispass:${uid}`,
        "type": "SevisPassIdentity",
        "name": name,
        "nationalId": nric,
        "uid": uid,
        "verificationStatus": "VERIFIED",
        "issuingAuthority": "SevisPass Government",
        "dateIssued": new Date().toISOString()
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
        "proofValue": generateMockProof(uid, name, nric) // In production, this would be a real cryptographic signature
      }
    };

    // Create QR code data for SevisWallet app deep link
    const sevisWalletData = {
      type: "SevisPassVC",
      version: "1.0",
      credential: verifiableCredential,
      deepLink: `seviswallet://import?type=vc&credential=${encodeURIComponent(JSON.stringify(verifiableCredential))}`
    };

    return NextResponse.json({
      type: 'seviswallet',
      credential: verifiableCredential,
      qrData: sevisWalletData,
      deepLink: sevisWalletData.deepLink,
      downloadUrl: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(verifiableCredential))}`
    });
  } catch (error) {
    console.error('Error generating SevisWallet VC:', error);
    throw error;
  }
}

// Mock proof generation - in production this would use real cryptographic signing
function generateMockProof(uid: string, name: string, nric: string): string {
  const data = `${uid}${name}${nric}${new Date().toISOString()}`;
  // This is a mock - in production you'd use actual Ed25519 signature
  return Buffer.from(data).toString('base64').substring(0, 64);
}