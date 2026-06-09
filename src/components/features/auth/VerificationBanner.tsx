import { Callout, Container, Link } from "@radix-ui/themes";
import { CheckCircledIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { accountsTable, isIndividualAccount } from "@/lib";
import { getPageSession } from "@/lib/api/utils";
import { verifyEmailUrl } from "@/lib/urls";
import {
  isEmailVerifiedInDb,
  isEmailVerifiedInOry,
  oryAddressesToAccountEmails,
} from "@/lib/accounts/email-verification";

/**
 * Email-verification banner rendered on every authenticated app page load.
 *
 * The check only runs while our DynamoDB record does not yet track the account
 * as verified. Once it does, this renders nothing and incurs no further work.
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
    await accountsTable.update({
      ...session.account,
      emails: oryAddressesToAccountEmails(session.orySession),
    });

    return (
      <Container size="4" px="2" mt="2">
        <Callout.Root color="green" role="status">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Thank you for verifying your email address.
          </Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  // Authenticated but unverified everywhere: nudge the user to verify.
  return (
    <Container size="4" px="2" mt="2">
      <Callout.Root color="amber" role="status">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          Please verify your email address to unlock all features.{" "}
          <Link href={verifyEmailUrl()}>Verify now</Link>.
        </Callout.Text>
      </Callout.Root>
    </Container>
  );
}
