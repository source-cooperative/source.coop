import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/api/utils";
import { accountsTable } from "@/lib/clients/database";

interface SettingsPageProps {
  params: Promise<{ account_id: string }>;
}

export default async function Redirect({ params }: SettingsPageProps) {
  const session = await getPageSession();
  if (!session) {
    redirect("/auth/login");
  }

  if (!session.account?.account_id) {
    redirect("/");
  }

  // Redirect to the profile page as the default settings page
  redirect(`/edit/profile/${session.account.account_id}`);
}
