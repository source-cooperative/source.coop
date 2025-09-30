import { redirect } from "next/navigation";
import { homeUrl, onboardingUrl } from "@/lib/urls";
import { getPageSession } from "@/lib/api/utils";
import { accountsTable, LOGGER, accountUrl } from "@/lib";

export default async function EmailVerifiedPage() {
  const session = await getPageSession();
  if (!session) {
    redirect(homeUrl());
  }
  if (!session.account) {
    redirect(onboardingUrl());
  }
  const verifiedAddresses = session.orySession?.identity?.verifiable_addresses;

  await accountsTable.update({
    ...session.account,

    // Update each email with verification status from Ory
    emails: session.account.emails?.map((email) => {
      const { verified, verified_at } = verifiedAddresses?.find(
        (address) => address.value === email.address
      ) || { verified: false, verified_at: undefined };
      return {
        ...email,
        verified,
        verified_at: verified_at?.toISOString(),
      };
    }),
  });
  redirect(onboardingUrl("verified=true"));
}
