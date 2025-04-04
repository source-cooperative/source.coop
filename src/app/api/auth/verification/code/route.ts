import { NextResponse } from 'next/server';
import { CONFIG } from "@/lib/config";

export async function POST(request: Request) {
  try {
    // Get cookies from the request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Parse request body
    const body = await request.json();
    const { code, email } = body;
    
    if (!code) {
      return NextResponse.json(
        { error: 'Missing verification code' },
        { status: 400 }
      );
    }
    
    console.log('Verifying code for existing flow:', {
      hasCode: !!code,
      hasEmail: !!email
    });
    
    // When a code is sent during registration, Ory provides a specific endpoint
    // to verify that code without needing to create a new flow
    const verifyResponse = await fetch(`${CONFIG.auth.apiUrl}/self-service/verification/methods/code/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'auth', // Special header that indicates auth endpoint usage without needing an explicit CSRF token
        'Cookie': cookieHeader,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        code,
        email
      }),
    });
    
    // Forward all cookies from Ory to the client
    const responseHeaders = new Headers();
    const setCookieHeader = verifyResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      responseHeaders.set('set-cookie', setCookieHeader);
      console.log('Setting cookies from Ory response');
    }
    
    // Get the response body
    const responseText = await verifyResponse.text();
    console.log('Raw verification response text:', responseText);
    
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.log('Response could not be parsed as JSON, using raw text');
      responseData = { text: responseText };
    }
    
    // If verification failed
    if (!verifyResponse.ok) {
      console.error('Code verification failed:', verifyResponse.status, responseData);
      return NextResponse.json(
        { error: responseData?.error || 'Verification failed' },
        { status: verifyResponse.status, headers: responseHeaders }
      );
    }
    
    console.log('Verification successful:', responseData);
    
    // Return success response
    return NextResponse.json({ success: true, data: responseData }, { headers: responseHeaders });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 