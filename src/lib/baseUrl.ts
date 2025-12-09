import { headers } from "next/headers";

/**
 * Get the base URL for the application
 * Works across production, preview, and local environments
 */
export async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") || "source.coop";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  return `${protocol}://${host}`;
}
