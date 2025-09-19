import { redirect } from "next/navigation";
import { LOGGER } from "@/lib";
import { onboardingUrl } from "@/lib/urls";

export default async function EmailVerifiedPage() {
  LOGGER.info("Email verification page loaded", {
    operation: "EmailVerifiedPage",
    context: "page load",
  });

  // Simple approach: always redirect to onboarding with verified flag
  // This ensures users don't get stuck on this page
  LOGGER.info("Email verified, redirecting to onboarding", {
    operation: "EmailVerifiedPage",
    context: "redirect",
  });
  redirect(onboardingUrl("verified=true"));
}
