/** Shared logout handler for the desktop dropdown and the mobile menu. */
export function logout() {
  // A top-level navigation to our own route, which asks Ory for the logout URL
  // server-side: a credentialed browser fetch to Ory is subject to CORS, and
  // Ory's custom domain answers logged-in requests with a wildcard origin that
  // browsers reject. The return path brings the user back to the current page.
  const returnTo = window.location.pathname + window.location.search;
  window.location.href = `/logout?return_to=${encodeURIComponent(returnTo)}`;
}
