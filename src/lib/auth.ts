"use server";

import { cookies } from "next/headers";

const ORY_BASE_URL = process.env.ORY_BASE_URL || "http://localhost:4000";

export async function getSession() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  
  try {
    const response = await fetch(`${ORY_BASE_URL}/sessions/whoami`, {
      method: "GET",
      credentials: "include",
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      return null;
    }

    const session = await response.json();
    return session;
  } catch (error) {
    console.error("Error fetching session:", error);
    return null;
  }
}

export async function get_account_id() {
  const session = await getSession();
  
  if (!session?.identity?.metadata_public?.account_id) {
    return null;
  }
  
  return session.identity.metadata_public.account_id;
}

// Keep the old function for backward compatibility, but mark as deprecated
/**
 * @deprecated Use get_account_id() instead to maintain consistent snake_case naming
 */
export async function getAccountId() {
  return get_account_id();
}

export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}

export async function initLoginFlow() {
  try {
    console.log("Initializing login flow...");
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    
    console.log(`Sending request to ${ORY_BASE_URL}/self-service/login/browser with cookie header length: ${cookieHeader.length}`);
    
    const response = await fetch(`${ORY_BASE_URL}/self-service/login/browser`, {
      method: "GET",
      redirect: "manual",
      headers: {
        Cookie: cookieHeader,
        'Accept': 'application/json',
      },
    });
    
    // Log the response status for debugging
    console.log("Login flow init response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    
    // Get the flow ID from the location header
    const location = response.headers.get("location");
    console.log("Login flow location header:", location);
    
    if (!location) {
      // If there's no location header, the response might have the flow in the body
      try {
        const data = await response.json();
        console.log("Response body:", data);
        
        if (data.id) {
          console.log("Found flow ID in response body:", data.id);
          return data.id;
        }
      } catch (err) {
        console.error("Error parsing response body:", err);
      }
      
      console.error("No location header or flow ID in response body");
      return null;
    }
    
    // Check if the location is an absolute URL or relative path
    let url;
    try {
      url = new URL(location);
    } catch (err) {
      // If it's not a valid URL, it might be a relative path
      url = new URL(location, ORY_BASE_URL);
    }
    
    const flowId = url.searchParams.get("flow");
    
    if (!flowId) {
      console.error("No flow ID in location header");
      return null;
    }
    
    console.log("Login flow initialized:", flowId);
    return flowId;
  } catch (error) {
    console.error("Error initializing login flow:", error);
    return null;
  }
}

export async function initRegistrationFlow() {
  try {
    console.log("Initializing registration flow...");
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    
    console.log(`Sending request to ${ORY_BASE_URL}/self-service/registration/browser with cookie header length: ${cookieHeader.length}`);
    
    const response = await fetch(`${ORY_BASE_URL}/self-service/registration/browser`, {
      method: "GET",
      redirect: "manual",
      headers: {
        Cookie: cookieHeader,
        'Accept': 'application/json',
      },
    });
    
    // Log the status and headers for debugging
    console.log("Registration flow init status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    
    // Get the flow ID from the location header
    const location = response.headers.get("location");
    console.log("Registration flow location header:", location);
    
    if (!location) {
      // If there's no location header, the response might have the flow in the body
      try {
        const data = await response.json();
        console.log("Response body:", data);
        
        if (data.id) {
          console.log("Found flow ID in response body:", data.id);
          return data.id;
        }
      } catch (err) {
        console.error("Error parsing response body:", err);
      }
      
      console.error("No location header or flow ID in response body");
      return null;
    }
    
    // Check if the location is an absolute URL or relative path
    let url;
    try {
      url = new URL(location);
    } catch (err) {
      // If it's not a valid URL, it might be a relative path
      url = new URL(location, ORY_BASE_URL);
    }
    
    const flowId = url.searchParams.get("flow");
    
    if (!flowId) {
      console.error("No flow ID in location header");
      return null;
    }
    
    console.log("Registration flow initialized:", flowId);
    return flowId;
  } catch (error) {
    console.error("Error initializing registration flow:", error);
    return null;
  }
}

// Helper function to determine if we're running on the client or server
function isClient() {
  return typeof window !== 'undefined';
}

// Helper to get the base URL for API calls (accounts for server vs client context)
function getApiBaseUrl() {
  if (isClient()) {
    // In client context, we can use relative URLs
    return '';
  } else {
    // In server context, we need absolute URLs
    // Try to get from environment variables, or use a reasonable default
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
}

export async function getLoginFlow(flowId: string) {
  try {
    console.log("Fetching login flow:", flowId);
    
    // Check if flowId is valid
    if (!flowId || typeof flowId !== 'string' || flowId.trim() === '') {
      console.error("Invalid flow ID:", flowId);
      return null;
    }
    
    // Try server-side method first
    let result = await getLoginFlowServerSide(flowId);
    
    // If server-side method fails due to CSRF or other issues, try client-side API
    if (!result) {
      console.log("Server-side flow fetch failed, trying API endpoint...");
      try {
        // Create a new flow via the API endpoint which handles cookie issues
        // Get proper base URL based on context
        const baseUrl = getApiBaseUrl();
        const apiUrl = `${baseUrl}/api/auth/login`;
        
        console.log("Using API URL:", apiUrl);
        
        const initResponse = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, max-age=0',
            'Pragma': 'no-cache'
          },
        });
        
        if (!initResponse.ok) {
          console.error("API endpoint failed:", await initResponse.text());
          return null;
        }
        
        const initData = await initResponse.json();
        const newFlowId = initData.flowId;
        
        if (!newFlowId) {
          console.error("No flow ID received from API");
          return null;
        }
        
        console.log("Got new flow ID from API:", newFlowId);
        
        // Now try to get the flow details with the new flow ID
        result = await getLoginFlowServerSide(newFlowId);
      } catch (apiErr) {
        console.error("Error using API endpoint fallback:", apiErr);
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error in getLoginFlow:", error);
    return null;
  }
}

// Internal function that performs the actual server-side flow fetch
async function getLoginFlowServerSide(flowId: string) {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    
    console.log(`Cookie header length for getLoginFlowServerSide: ${cookieHeader.length}`);
    
    const response = await fetch(`${ORY_BASE_URL}/self-service/login/flows?id=${flowId}`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'Pragma': 'no-cache'
      },
      cache: 'no-store', // Ensure we don't use cached responses
    });
    
    console.log("Login flow fetch status:", response.status);
    
    if (!response.ok) {
      console.error("Failed to fetch login flow:", response.status, response.statusText);
      
      try {
        // Try to get error details
        const errorData = await response.json();
        console.error("Error details:", JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error("Could not parse error response");
      }
      
      return null;
    }
    
    const data = await response.json();
    console.log("Login flow fetched successfully, action URL:", data.ui?.action);
    return data;
  } catch (error) {
    console.error("Error in getLoginFlowServerSide:", error);
    return null;
  }
}

export async function getRegistrationFlow(flowId: string) {
  try {
    console.log("Fetching registration flow:", flowId);
    
    // Check if flowId is valid
    if (!flowId || typeof flowId !== 'string' || flowId.trim() === '') {
      console.error("Invalid flow ID:", flowId);
      return null;
    }
    
    // Try server-side method first
    let result = await getRegistrationFlowServerSide(flowId);
    
    // If server-side method fails due to CSRF or other issues, try client-side API
    if (!result) {
      console.log("Server-side flow fetch failed, trying API endpoint...");
      try {
        // Create a new flow via the API endpoint which handles cookie issues
        // Get proper base URL based on context
        const baseUrl = getApiBaseUrl();
        const apiUrl = `${baseUrl}/api/auth/register`;
        
        console.log("Using API URL:", apiUrl);
        
        const initResponse = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, max-age=0',
            'Pragma': 'no-cache'
          },
        });
        
        if (!initResponse.ok) {
          console.error("API endpoint failed:", await initResponse.text());
          return null;
        }
        
        const initData = await initResponse.json();
        const newFlowId = initData.flowId;
        
        if (!newFlowId) {
          console.error("No flow ID received from API");
          return null;
        }
        
        console.log("Got new flow ID from API:", newFlowId);
        
        // Now try to get the flow details with the new flow ID
        result = await getRegistrationFlowServerSide(newFlowId);
      } catch (apiErr) {
        console.error("Error using API endpoint fallback:", apiErr);
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error in getRegistrationFlow:", error);
    return null;
  }
}

// Internal function that performs the actual server-side flow fetch
async function getRegistrationFlowServerSide(flowId: string) {
  try {
    // Get cookies for server-side request
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    
    console.log("Cookie header length for getRegistrationFlowServerSide:", cookieHeader?.length || 0);
    
    const response = await fetch(`${ORY_BASE_URL}/self-service/registration/flows?id=${flowId}`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'Pragma': 'no-cache'
      },
      cache: 'no-store', // Ensure we don't use cached responses
    });
    
    // Log response status for debugging
    console.log("Registration flow fetch status:", response.status);
    
    if (!response.ok) {
      console.error("Failed to fetch registration flow:", response.status, response.statusText);
      
      try {
        // Try to get error details
        const errorData = await response.json();
        console.error("Error details:", JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error("Could not parse error response");
      }
      
      return null;
    }
    
    const data = await response.json();
    console.log("Registration flow fetched successfully, action URL:", data.ui?.action);
    return data;
  } catch (error) {
    console.error("Error in getRegistrationFlowServerSide:", error);
    return null;
  }
} 