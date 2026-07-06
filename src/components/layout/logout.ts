import { CONFIG, LOGGER } from "@/lib";

/** Shared logout handler for the desktop dropdown and the mobile menu. */
export async function logout() {
  // Return to the current page after logout instead of Ory's default (root).
  // Base arg resolves the dev-only relative route (frontendUrl is "" in dev,
  // proxied same-origin); ignored when the route is already absolute (prod).
  const logoutFlow = new URL(CONFIG.auth.routes.logout, window.location.origin);
  logoutFlow.searchParams.set("return_to", window.location.href);
  const response = await fetch(logoutFlow, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    LOGGER.error(
      `Failed to logout: ${response.status} ${response.statusText}`,
      { operation: "logout", metadata: { response } }
    );
    return;
  }
  const { logout_url } = await response.json();
  window.location.href = logout_url;
}
