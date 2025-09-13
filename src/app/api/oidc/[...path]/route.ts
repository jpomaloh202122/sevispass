import { NextRequest, NextResponse } from 'next/server';
import { getOidcProvider } from '@/lib/oidc-provider';

// Handle all OIDC Provider routes
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const provider = await getOidcProvider();
  const path = params.path.join('/');
  
  try {
    // Create a mock Node.js-style request/response for oidc-provider
    const mockReq = {
      method: 'GET',
      url: `/api/oidc/${path}${request.nextUrl.search}`,
      headers: Object.fromEntries(request.headers.entries()),
      body: null,
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

    // Handle the request with oidc-provider
    await provider.callback(mockReq as any, mockRes as any);

    // Convert response back to Next.js format
    const headers = new Headers();
    Object.entries(mockRes.headers).forEach(([name, value]) => {
      headers.set(name, value);
    });

    return new NextResponse(mockRes.body, {
      status: mockRes.statusCode,
      headers,
    });

  } catch (error) {
    console.error('OIDC Provider GET error:', error);
    return NextResponse.json(
      { error: 'internal_server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const provider = await getOidcProvider();
  const path = params.path.join('/');
  
  try {
    // Get request body
    const body = await request.text();
    
    // Create a mock Node.js-style request/response for oidc-provider
    const mockReq = {
      method: 'POST',
      url: `/api/oidc/${path}`,
      headers: Object.fromEntries(request.headers.entries()),
      body,
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

    // Handle the request with oidc-provider
    await provider.callback(mockReq as any, mockRes as any);

    // Convert response back to Next.js format
    const headers = new Headers();
    Object.entries(mockRes.headers).forEach(([name, value]) => {
      headers.set(name, value);
    });

    return new NextResponse(mockRes.body, {
      status: mockRes.statusCode,
      headers,
    });

  } catch (error) {
    console.error('OIDC Provider POST error:', error);
    return NextResponse.json(
      { error: 'internal_server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods if needed
export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleOtherMethods('PUT', request, params);
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleOtherMethods('PATCH', request, params);
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleOtherMethods('DELETE', request, params);
}

async function handleOtherMethods(method: string, request: NextRequest, { path }: { path: string[] }) {
  const provider = await getOidcProvider();
  const pathStr = path.join('/');
  
  try {
    const body = await request.text();
    
    const mockReq = {
      method,
      url: `/api/oidc/${pathStr}`,
      headers: Object.fromEntries(request.headers.entries()),
      body,
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

    await provider.callback(mockReq as any, mockRes as any);

    const headers = new Headers();
    Object.entries(mockRes.headers).forEach(([name, value]) => {
      headers.set(name, value);
    });

    return new NextResponse(mockRes.body, {
      status: mockRes.statusCode,
      headers,
    });

  } catch (error) {
    console.error(`OIDC Provider ${method} error:`, error);
    return NextResponse.json(
      { error: 'internal_server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}