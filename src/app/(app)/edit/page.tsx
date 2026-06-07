import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/api/utils";
import { editProfileUrl, homeUrl, loginUrl } from "@/lib/urls";
import { getReturnToUrl } from "@/lib/baseUrl";

interface SettingsPageProps {
  params: Promise<{ account_id: string }>;
}

export default async function Redirect({ params }: SettingsPageProps) {
  const session = await getPageSession();
  if (!session) {
    redirect(loginUrl(await getReturnToUrl()));
  }

  if (!session.account?.account_id) {
    redirect(homeUrl());
  }

  // Redirect to the profile page as the default settings page
  redirect(editProfileUrl(session.account.account_id));
}
