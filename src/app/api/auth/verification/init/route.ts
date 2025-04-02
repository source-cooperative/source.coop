import { NextResponse } from 'next/server';
import { Configuration, FrontendApi } from '@ory/client';

const ORY_BASE_URL = process.env.ORY_BASE_URL || "http://localhost:4000";

// Initialize Ory SDK for server-side usage
const _ory = new FrontendApi(
  new Configuration({
    basePath: ORY_BASE_URL,
    baseOptions: {
      withCredentials: true,
    },
  })
);

export async function GET(request: Request) {
  try {
    // Get cookies from the request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Initialize a new verification flow
    const response = await fetch(`${ORY_BASE_URL}/self-service/verification/flows?return_to=http://localhost:3000/onboarding`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
        Accept: 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Verification flow initialization failed:', errorData);
      return NextResponse.json(
        { error: 'Failed to initialize verification flow' },
        { status: response.status }
      );
    }
    
    // Return the verification flow data
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Verification flow initialization error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 