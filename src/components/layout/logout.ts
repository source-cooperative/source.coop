import { CONFIG, LOGGER } from "@/lib";

/** Shared logout handler for the desktop dropdown and the mobile menu. */
export async function logout() {
  const response = await fetch(CONFIG.auth.routes.logout, {
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
