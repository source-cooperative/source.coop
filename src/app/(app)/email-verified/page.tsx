/**
 * Legacy destination for Ory's post-verification redirect. The email-sync and
 * confirmation banner now run on every authenticated page load (see the (app)
 * layout + `reconcileEmailVerification`), so this route just forwards the user
 * to a sensible page where that banner will be shown.
 */

import { redirect } from "next/navigation";
import { accountUrl, homeUrl, onboardingUrl } from "@/lib/urls";
import { getPageSession } from "@/lib/api/utils";

export default async function EmailVerifiedPage() {
  const session = await getPageSession();
  if (!session) {
    redirect(homeUrl());
  }
  if (!session.account) {
    redirect(onboardingUrl());
  }
  redirect(accountUrl(session.account.account_id));
}
