import { NextRequest, NextResponse } from 'next/server';
import { oidcProviderService } from '@/digital-id-core-stack/modules/auth/src/services/oidc-provider.service';

// Initialize OIDC provider
let providerInitialized = false;

async function ensureProviderInitialized() {
  if (!providerInitialized) {
    await oidcProviderService.initialize();
    providerInitialized = true;
  }
}

// Handle all OIDC requests
export async function GET(request: NextRequest) {
  await ensureProviderInitialized();
  
  const url = new URL(request.url);
  const pathname = url.pathname.replace('/api/oidc', '');
  
  try {
    const provider = oidcProviderService.getProvider();
    
    // Create a mock Express-like request/response
    const req = {
      method: 'GET',
      url: pathname + url.search,
      headers: Object.fromEntries(request.headers.entries()),
    };
    
    const res = {
      status: 200,
      headers: new Headers(),
      body: null as any,
      setHeader(name: string, value: string) {
        this.headers.set(name, value);
      },
      redirect(url: string) {
        this.status = 302;
        this.headers.set('Location', url);
      },
      json(data: any) {
        this.body = JSON.stringify(data);
        this.headers.set('Content-Type', 'application/json');
      },
      send(data: string) {
        this.body = data;
      }
    };
    
    // Handle the OIDC request
    await provider.callback()(req, res, () => {});
    
    return new NextResponse(res.body, {
      status: res.status,
      headers: res.headers
    });
    
  } catch (error) {
    console.error('OIDC Error:', error);
    return NextResponse.json(
      { error: 'OIDC provider error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await ensureProviderInitialized();
  
  const url = new URL(request.url);
  const pathname = url.pathname.replace('/api/oidc', '');
  const body = await request.text();
  
  try {
    const provider = oidcProviderService.getProvider();
    
    // Create a mock Express-like request/response
    const req = {
      method: 'POST',
      url: pathname + url.search,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
    };
    
    const res = {
      status: 200,
      headers: new Headers(),
      body: null as any,
      setHeader(name: string, value: string) {
        this.headers.set(name, value);
      },
      redirect(url: string) {
        this.status = 302;
        this.headers.set('Location', url);
      },
      json(data: any) {
        this.body = JSON.stringify(data);
        this.headers.set('Content-Type', 'application/json');
      },
      send(data: string) {
        this.body = data;
      }
    };
    
    // Handle the OIDC request
    await provider.callback()(req, res, () => {});
    
    return new NextResponse(res.body, {
      status: res.status,
      headers: res.headers
    });
    
  } catch (error) {
    console.error('OIDC POST Error:', error);
    return NextResponse.json(
      { error: 'OIDC provider error', details: error.message },
      { status: 500 }
    );
  }
}