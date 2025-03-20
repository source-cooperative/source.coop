"use server";

import { cookies } from "next/headers";

const ORY_BASE_URL = process.env.ORY_BASE_URL || "https://playground.projects.oryapis.com";

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
    
    const response = await fetch(`${ORY_BASE_URL}/self-service/login/browser`, {
      method: "GET",
      redirect: "manual",
      headers: {
        Cookie: cookieHeader,
        'Accept': 'application/json',
      },
    });
    
    // Get the flow ID from the location header
    const location = response.headers.get("location");
    
    if (!location) {
      console.error("No location header in login flow response");
      return null;
    }
    
    const url = new URL(location);
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
    console.log("Registration flow location header:", response.headers.get("location"));
    
    // Get the flow ID from the location header
    const location = response.headers.get("location");
    
    if (!location) {
      console.error("No location header in registration flow response");
      return null;
    }
    
    const url = new URL(location);
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

export async function getLoginFlow(flowId: string) {
  try {
    console.log("Fetching login flow:", flowId);
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    
    const response = await fetch(`${ORY_BASE_URL}/self-service/login/flows?id=${flowId}`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error("Failed to fetch login flow:", response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching login flow:", error);
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
    
    // Get cookies for server-side request
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    
    console.log("Cookie header length:", cookieHeader?.length || 0);
    
    const response = await fetch(`${ORY_BASE_URL}/self-service/registration/flows?id=${flowId}`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        'Accept': 'application/json',
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
        console.error("Error details:", errorData);
      } catch (e) {
        console.error("Could not parse error response");
      }
      
      return null;
    }
    
    const data = await response.json();
    console.log("Registration flow fetched successfully");
    return data;
  } catch (error) {
    console.error("Error fetching registration flow:", error);
    return null;
  }
} 