import { NextRequest, NextResponse } from 'next/server';
import { getOidcProvider } from '@/lib/oidc-provider';

export async function POST(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const provider = await getOidcProvider();
    const body = await request.json();
    
    // Create mock request/response objects for oidc-provider
    const mockReq = {
      method: 'POST',
      url: `/api/auth/interaction/${params.uid}/confirm`,
      headers: Object.fromEntries(request.headers.entries()),
      body: JSON.stringify(body),
    };

    const mockRes = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: '',
      setHeader: function(name: string, value: string) {
        this.headers[name.toLowerCase()] = value;
      },
      end: function(data?: string) {
        if (data) this.body = data;
      },
      redirect: function(url: string) {
        this.statusCode = 302;
        this.setHeader('location', url);
      },
    };

    // Handle login confirmation
    if (body.login) {
      await provider.interactionFinished(mockReq as any, mockRes as any, {
        login: {
          accountId: body.login.accountId,
        },
      });
    }
    
    // Handle consent confirmation
    if (body.consent) {
      await provider.interactionFinished(mockReq as any, mockRes as any, {
        consent: {
          grantId: body.consent.grantId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error confirming interaction:', error);
    return NextResponse.json(
      { error: 'Failed to confirm interaction' },
      { status: 500 }
    );
  }
}