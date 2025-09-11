import { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/features/onboarding";
import { getPageSession } from "@/lib/api/utils";

export const metadata: Metadata = {
  title: "Complete Your Profile",
  description: "Choose your username and set up your profile",
};

export default async function OnboardingPage() {
  const session = await getPageSession();
  const identityId = session?.identity_id;

  if (!identityId) {
    redirect("/");
  }

  if (session?.account) {
    redirect(`/${session.account.account_id}`);
  }

  return <OnboardingForm identityId={identityId} />;
}
