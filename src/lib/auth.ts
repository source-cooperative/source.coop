"use server";

import { cookies } from "next/headers";
import { serverOry } from './ory';
import type { ExtendedSession } from "@/types/session";

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
