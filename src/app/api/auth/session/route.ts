import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Configuration, FrontendApi } from '@ory/client';

const ORY_BASE_URL = process.env.ORY_BASE_URL || "http://localhost:4000";

// Initialize Ory SDK for server-side usage
const ory = new FrontendApi(
  new Configuration({
    basePath: ORY_BASE_URL,
    baseOptions: {
      withCredentials: true,
    },
  })
);

export async function GET(request: Request) {
  try {
    // Forward the cookies to Ory
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Make a direct request to Ory with cookies
    const sessionResponse = await fetch(`${ORY_BASE_URL}/sessions/whoami`, {
      headers: {
        Cookie: cookieHeader,
        Accept: 'application/json',
      },
    });
    
    // Return the response data
    if (sessionResponse.ok) {
      const session = await sessionResponse.json();
      return NextResponse.json(session);
    }
    
    // Return unauthenticated response for 401/403
    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('Session check failed:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
} 