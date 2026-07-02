import { StatusPage } from "./StatusPage";
import { LoginButton } from "./LoginButton";

/**
 * Interstitial shown when an unauthenticated user hits a page that requires
 * login. Replaces a server-side redirect-to-login so the return_to can be
 * computed client-side (see LoginButton) instead of via middleware headers.
 */
export function LoginRequired() {
  return (
    <StatusPage
      type="unauthenticated"
      action={<LoginButton>Sign in</LoginButton>}
    />
  );
}
