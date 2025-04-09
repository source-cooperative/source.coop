import { NextResponse } from 'next/server';
import { Configuration, FrontendApi } from '@ory/client';
import { CONFIG } from "@/lib/config";

export async function POST(request: Request) {
  try {
    // Get cookies from the request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Parse request body
    const body = await request.json();
    const { flow, code, method = 'code', csrf_token, email } = body;
    
    console.log('Verification complete request received:', {
      flow,
      method,
      hasCode: !!code,
      hasCSRF: !!csrf_token,
      hasEmail: !!email
    });
    
    if (!flow || !code) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Construct the correct endpoint with the flow ID as a query parameter
    const completeUrl = `${CONFIG.auth.api.backendUrl}/self-service/verification?flow=${flow}`;
    
    console.log('Sending verification request to Ory:', {
      url: completeUrl,
      method,
      csrf_token,
      email,
      hasCode: !!code
    });
    
    // Prepare the payload based on Ory's requirements
    const payload: Record<string, any> = {
      method,
      code
    };
    
    // Only include csrf_token and email if they exist
    if (csrf_token) payload.csrf_token = csrf_token;
    if (email) payload.email = email;
    
    // Send verification request to Ory
    const response = await fetch(completeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    // Forward all cookies from Ory to the client
    const responseHeaders = new Headers();
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      responseHeaders.set('set-cookie', setCookieHeader);
      console.log('Setting cookies from Ory response');
    }
    
    // Get the raw response for detailed logging
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse Ory response as JSON:', responseText);
      responseData = { text: responseText };
    }
    
    // If verification failed
    if (!response.ok) {
      console.error('Verification failed with status:', response.status, responseData);
      return NextResponse.json(
        { error: responseData },
        { status: response.status, headers: responseHeaders }
      );
    }
    
    // Successful verification
    console.log('Verification succeeded with response:', responseData);
    
    // Check if we need to make an additional call to verify the identity
    try {
      const sessionResponse = await fetch(
        `${CONFIG.auth.api.backendUrl}/sessions/whoami`,
        {
          headers: {
            Cookie: cookieHeader,
            Accept: "application/json",
          },
        }
      );
      
      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        console.log('Current user session after verification:', {
          identity_id: session.identity?.id,
          email: session.identity?.traits?.email,
          verified_addresses: session.identity?.verifiable_addresses
        });
      }
    } catch (err) {
      console.warn('Failed to check session after verification:', err);
    }
    
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