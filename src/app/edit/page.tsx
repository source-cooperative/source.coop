import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/api/utils";
import { CONFIG } from "@/lib/config";

interface SettingsPageProps {
  params: Promise<{ account_id: string }>;
}

export default async function Redirect({ params }: SettingsPageProps) {
  const session = await getPageSession();
  if (!session) {
    redirect(CONFIG.auth.routes.login);
  }

  if (!session.account?.account_id) {
    redirect("/");
  }

  // Redirect to the profile page as the default settings page
  redirect(`/edit/profile/${session.account.account_id}`);
}
