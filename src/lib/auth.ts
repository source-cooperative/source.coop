"use server";

import { cookies } from "next/headers";

// Use the environment variable for the Ory URL
const ORY_BASE_URL = process.env.ORY_SDK_URL || "http://localhost:4000";

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
    
    // Extract the flow ID from the location URL
    let flowId;
    try {
      const url = new URL(location, ORY_BASE_URL);
      flowId = url.searchParams.get("flow");
    } catch (err) {
      console.error("Failed to parse location URL:", err);
      return null;
    }
    
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
    
    // Extract the flow ID from the location URL
    let flowId;
    try {
      const url = new URL(location, ORY_BASE_URL);
      flowId = url.searchParams.get("flow");
    } catch (err) {
      console.error("Failed to parse location URL:", err);
      return null;
    }
    
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
    console.log("Getting login flow...");
    
    // Always create a new flow via the API endpoint
    // Get proper base URL based on context
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/api/auth/login`;
    
    console.log("Using API URL for login flow:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'Pragma': 'no-cache'
      },
    });
    
    if (!response.ok) {
      console.error("API endpoint failed:", await response.text());
      return null;
    }
    
    const data = await response.json();
    console.log("Got login flow with ID:", data.flowId);
    
    // Return the UI data directly from the API response
    return data.flow;
  } catch (error) {
    console.error("Error in getLoginFlow:", error);
    return null;
  }
}

export async function getRegistrationFlow(flowId: string) {
  try {
    console.log("Getting registration flow...");
    
    // Always create a new flow via the API endpoint
    // Get proper base URL based on context
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/api/auth/register`;
    
    console.log("Using API URL for registration flow:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'Pragma': 'no-cache'
      },
    });
    
    if (!response.ok) {
      console.error("API endpoint failed:", await response.text());
      return null;
    }
    
    const data = await response.json();
    console.log("Got registration flow with ID:", data.flowId);
    
    // Return the UI data directly from the API response
    return data.flow;
  } catch (error) {
    console.error("Error in getRegistrationFlow:", error);
    return null;
  }
} 