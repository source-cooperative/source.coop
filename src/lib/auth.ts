"use server";

import { cookies } from "next/headers";
import { serverOry } from './ory';
import type { ExtendedSession } from '@/types/session';
import { CONFIG } from './config';

export async function getSession(): Promise<ExtendedSession | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  
  try {
    const response = await serverOry.toSession({
      cookie: cookieHeader
    });
    
    return response.data as ExtendedSession;
  } catch (error: any) {
    // 401 is normal for unauthenticated users - not an error
    if (error.response?.status === 401) {
      return null;
    }
    
    // Only log network-level errors, not authentication errors
    if (error.code === 'ECONNREFUSED') {
      console.error("Connection refused - Ory tunnel is not running");
    } else if (error.response?.status !== 401) {
      console.error("Unexpected error fetching session:", error);
    }
    
    return null;
  }
}

export async function getAccountId(): Promise<string | null> {
  const session = await getSession();
  
  if (!session?.identity?.metadata_public?.account_id) {
    return null;
  }
  
  return session.identity.metadata_public.account_id;
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

export async function initLoginFlow() {
  try {
    const response = await serverOry.createBrowserLoginFlow();
    return response.data.id;
  } catch (error: any) {
    if (error.response?.status !== 401) {
      console.error("Error initializing login flow:", error);
    }
    return null;
  }
}

export async function initRegistrationFlow() {
  try {
    const response = await serverOry.createBrowserRegistrationFlow();
    return response.data.id;
  } catch (error: any) {
    if (error.response?.status !== 401) {
      console.error("Error initializing registration flow:", error);
    }
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
    return CONFIG.api.baseUrl;
  }
}

export async function getLoginFlow(_flowId: string) {
  try {
    // Get proper base URL based on context
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/api/auth/login`;
    
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
      return null;
    }
    
    const data = await response.json();
    return data.flow;
  } catch (error) {
    console.error("Error in getLoginFlow:", error);
    return null;
  }
}

export async function getRegistrationFlow(_flowId: string) {
  try {
    // Get proper base URL based on context
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/api/auth/register`;
    
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
      return null;
    }
    
    const data = await response.json();
    return data.flow;
  } catch (error) {
    console.error("Error in getRegistrationFlow:", error);
    return null;
  }
}

export async function getServerSession(): Promise<ExtendedSession | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    
    // Debug configuration
    console.log("Server-side Ory config:", {
      backendApiUrl: CONFIG.auth.api.backendUrl,
      cookieHeader: cookieHeader.substring(0, 100) + "...",
    });
    
    // Debug cookie details
    const cookieList = cookieStore.getAll();
    const cookieNames = cookieList.map(c => c.name);
    console.log("Debug cookies:", {
      hasCookies: !!cookieHeader,
      cookieLength: cookieHeader.length,
      backendApiUrl: CONFIG.auth.api.backendUrl,
      cookieNames,
      cookieHeader: cookieHeader.substring(0, 100) + "...",
    });
    
    try {
      const response = await serverOry.toSession({
        cookie: cookieHeader
      });
      return response.data as ExtendedSession;
    } catch (error: any) {
      // Log all errors for debugging
      console.log('Ory session error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      // 401 is normal for unauthenticated users
      if (error.response?.status === 401) {
        return null;
      }
      
      // Log unexpected errors
      if (error.response?.status !== 401) {
        console.error('Unexpected error in getServerSession:', error);
      }
      return null;
    }
  } catch (error) {
    // Log only unexpected errors
    console.error('Unexpected error in getServerSession:', error);
    return null;
  }
}

export async function requireServerAuth(): Promise<ExtendedSession | null> {
  const session = await getServerSession();
  if (!session?.identity?.metadata_public?.account_id) {
    return null;
  }
  return session;
} 