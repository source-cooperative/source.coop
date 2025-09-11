import { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/features/onboarding";
import { getPageSession } from "@/lib/api/utils";
import { FormTitle } from "@/components/core";

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

  return (
    <>
      <FormTitle
        title="Complete Your Profile"
        description="You're almost done! Choose a username for your account and tell us your name."
      />
      <OnboardingForm identityId={identityId} />
    </>
  );
}
