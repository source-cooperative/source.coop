import { accountsTable, isIndividualAccount } from "@/lib";
import { getPageSession } from "@/lib/api/utils";
import {
  isEmailVerifiedInDb,
  isEmailVerifiedInOry,
  oryAddressesToAccountEmails,
} from "@/lib/accounts/email-verification";
import { EmailVerificationCallout } from "./EmailVerificationCallout";

/**
 * Email-verification banner rendered on every authenticated app page load.
 *
 * Mounted inside a <Suspense> boundary in the (app) layout so its session and
 * database reads stream in without blocking navigation.
 *
 * The check only does work while our DynamoDB record does not yet track the
 * account as verified. Once it does, this renders nothing.
 *
 * - Unauthenticated, no individual account, or already verified in our DB →
 *   nothing.
 * - Not verified in our DB but verified on Ory → our record is stale, so we sync
 *   it to match Ory and thank the user. The next page load reads the synced
 *   record and renders nothing.
 * - Not verified anywhere → nudge the user to verify their email.
 */
export async function VerificationBanner() {
  const session = await getPageSession();
  if (!session?.account || !isIndividualAccount(session.account)) {
    return null;
  }

  // Our DB already tracks the user as verified — nothing to do.
  if (isEmailVerifiedInDb(session.account)) {
    return null;
  }

  // Verified upstream on Ory but our record is stale: persist it and say thanks.
  if (isEmailVerifiedInOry(session.orySession)) {
    try {
      await accountsTable.update({
        ...session.account,
        emails: oryAddressesToAccountEmails(session.orySession),
      });
    } catch (err) {
      // Non-fatal: the banner still shows "just-verified" and the sync
      // will be retried on the next page load.
      console.error(
        "[VerificationBanner] Failed to sync verified email to DB:",
        err,
      );
    }
    return <EmailVerificationCallout status="just-verified" />;
  }

  // Authenticated but unverified everywhere: nudge the user to verify.
  return <EmailVerificationCallout status="unverified" />;
}
