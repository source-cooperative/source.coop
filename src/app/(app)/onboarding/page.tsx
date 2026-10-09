import { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/features/onboarding";
import { getPageSession } from "@/lib/api/utils";
import { FormTitle } from "@/components/core";
import { homeUrl, accountUrl } from "@/lib/urls";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("OnboardingPage");
  return { title: t("title"), description: t("metaDescription") };
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const session = await getPageSession();
  const identityId = session?.identity_id;
  const query = await searchParams;

  if (!identityId) {
    redirect(homeUrl());
  }

  if (session?.account) {
    redirect(
      `${accountUrl(session.account.account_id)}${
        Object.keys(query).includes("verified") ? "?verified" : ""
      }`
    );
  }

  const t = await getTranslations("OnboardingPage");

  return (
    <>
      <FormTitle title={t("title")} description={t("description")} />
      <OnboardingForm identityId={identityId} />
    </>
  );
}
