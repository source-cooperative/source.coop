import { NextRequest, NextResponse } from "next/server";

const ORY_BASE_URL = process.env.ORY_SDK_URL || "http://localhost:4000";

export async function GET(request: NextRequest) {
  console.log("API: Initializing new login flow");
  
  try {
    // Initialize a new login flow via the Ory CLI tunnel
    const response = await fetch(`${ORY_BASE_URL}/self-service/login/browser`, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        "Pragma": "no-cache"
      },
    });
    
    console.log(`API: Login flow init response status: ${response.status}`);
    
    // Get flow ID from either location header or response body
    let flowId: string | null = null;
    
    // First check the location header
    const location = response.headers.get("location");
    if (location) {
      console.log(`API: Found location header: ${location}`);
      try {
        const url = new URL(location, ORY_BASE_URL);
        flowId = url.searchParams.get("flow");
        console.log(`API: Extracted flow ID from location: ${flowId}`);
      } catch (err) {
        console.error("API: Failed to parse location URL:", err);
      }
    }
    
    // If no flow ID from location, try the response body
    if (!flowId) {
      try {
        const data = await response.json();
        if (data.id) {
          flowId = data.id;
          console.log(`API: Extracted flow ID from body: ${flowId}`);
        }
      } catch (err) {
        console.error("API: Failed to parse response body:", err);
      }
    }
    
    // If we still have no flow ID, return an error
    if (!flowId) {
      console.error("API: No flow ID found in response");
      return NextResponse.json({ error: "Failed to initialize login flow" }, { status: 500 });
    }
    
    // Get the complete flow data
    let flowData;
    try {
      const flowResponse = await fetch(`${ORY_BASE_URL}/self-service/login/flows?id=${flowId}`, {
        method: "GET",
        headers: {
          'Accept': 'application/json',
          // Forward all cookies that we've received from Ory
          'Cookie': response.headers.get('set-cookie') || '',
        },
      });
      
      if (flowResponse.ok) {
        flowData = await flowResponse.json();
        console.log("API: Successfully fetched flow data");
      } else {
        console.error("API: Failed to fetch flow data:", flowResponse.status);
      }
    } catch (err) {
      console.error("API: Error fetching flow data:", err);
    }
    
    // Create a response with the flow ID and flow data
    const jsonResponse = NextResponse.json({ 
      flowId,
      flow: flowData  // Include the complete flow data
    });
    
    // Forward all cookies from Ory's response
    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders.length > 0) {
      console.log(`API: Forwarding ${setCookieHeaders.length} cookies from Ory response`);
      setCookieHeaders.forEach(cookieHeader => {
        try {
          jsonResponse.headers.append('Set-Cookie', cookieHeader);
        } catch (err) {
          console.error(`API: Failed to forward cookie:`, err);
        }
      });
    }
    
    // Add cache control headers to prevent stale responses
    jsonResponse.headers.set('Cache-Control', 'no-store, no-cache, max-age=0');
    jsonResponse.headers.set('Pragma', 'no-cache');
    
    return jsonResponse;
  } catch (error) {
    console.error("API: Error initializing login flow:", error);
    return NextResponse.json(
      { error: "Failed to initialize login flow" },
      { status: 500 }
    );
  }
} 