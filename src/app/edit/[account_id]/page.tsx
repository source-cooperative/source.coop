import { redirect } from "next/navigation";

interface SettingsPageProps {
  params: Promise<{ account_id: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { account_id } = await params;

  // Redirect to the profile page as the default settings page
  redirect(`/edit/profile/${account_id}`);
}
