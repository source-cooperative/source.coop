import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/api/utils";
import { editProfileUrl, homeUrl } from "@/lib/urls";
import { LoginRequired } from "@/components/core";

export default async function Redirect() {
  const session = await getPageSession();
  if (!session) {
    return <LoginRequired />;
  }

  if (!session.account?.account_id) {
    redirect(homeUrl());
  }

  // Redirect to the profile page as the default settings page
  redirect(editProfileUrl(session.account.account_id));
}
