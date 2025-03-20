import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ORY_BASE_URL = process.env.ORY_BASE_URL || "http://localhost:4000";

export async function GET(request: NextRequest) {
  // Log that we're starting a new login flow via the API
  console.log("API: Initializing new login flow");
  
  // Log the request cookies for debugging
  console.log(`API: Current cookies in request:`);
  request.cookies.getAll().forEach(c => 
    console.log(`- ${c.name}: [length: ${c.value.length}]`)
  );
  
  try {
    // Explicitly clear out any existing Ory cookies to prevent CSRF issues
    const cookieHeader = request.headers.get("cookie") || "";
    console.log(`API: Incoming cookie header length: ${cookieHeader.length}`);
    
    // Make the request to initialize a new login flow
    const response = await fetch(`${ORY_BASE_URL}/self-service/login/browser`, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "application/json",
        // Either don't send cookies or explicitly clear problematic ones
        // Cookie: cookieHeader,
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
        // Parse the URL to get the flow ID
        const url = new URL(location.startsWith("http") ? location : `${ORY_BASE_URL}${location}`);
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
    
    // Create a response with the flow ID
    const jsonResponse = NextResponse.json({ flowId });
    
    // Forward all cookies from Ory's response
    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders.length > 0) {
      console.log(`API: Forwarding ${setCookieHeaders.length} cookies from Ory response`);
      setCookieHeaders.forEach(cookieHeader => {
        const cookieParts = cookieHeader.split(';')[0].split('=');
        if (cookieParts.length >= 2) {
          const name = cookieParts[0].trim();
          const value = cookieParts.slice(1).join('=');
          console.log(`API: Setting cookie ${name} with length ${value.length}`);
          
          // Parse and set the cookie with all its original parameters
          const cookieOptions: any = {};
          
          cookieHeader.split(';').slice(1).forEach(part => {
            const [key, value] = part.trim().split('=');
            if (key.toLowerCase() === 'expires') cookieOptions.expires = value;
            if (key.toLowerCase() === 'max-age') cookieOptions.maxAge = Number(value);
            if (key.toLowerCase() === 'domain') cookieOptions.domain = value;
            if (key.toLowerCase() === 'path') cookieOptions.path = value;
            if (key.toLowerCase() === 'secure') cookieOptions.secure = true;
            if (key.toLowerCase() === 'httponly') cookieOptions.httpOnly = true;
            if (key.toLowerCase() === 'samesite') cookieOptions.sameSite = value;
          });
          
          // Apply all cookie options exactly as they were sent
          jsonResponse.cookies.set(name, value, cookieOptions);
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