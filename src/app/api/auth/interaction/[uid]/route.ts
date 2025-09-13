import { NextRequest, NextResponse } from 'next/server';
import { getOidcProvider } from '@/lib/oidc-provider';

export async function GET(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const provider = await getOidcProvider();
    const details = await provider.interactionDetails(request as any, { uid: params.uid } as any);
    
    return NextResponse.json({
      prompt: details.prompt,
      params: details.params,
      client: details.client,
      session: details.session,
    });
  } catch (error) {
    console.error('Error fetching interaction details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interaction details' },
      { status: 500 }
    );
  }
}