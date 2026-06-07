"use server";

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

/**
 * Get the full URL of the current request, including path and query string.
 * Requires x-pathname and x-search headers injected by middleware.
 */
export async function getReturnToUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") || "source.coop";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const pathname = headersList.get("x-pathname") || "/";
  const search = headersList.get("x-search") || "";
  return `${protocol}://${host}${pathname}${search}`;
}
