import { redirect } from "next/navigation";
import { editAccountProfileUrl } from "@/lib/urls";

interface AccountRedirectPageProps {
  params: Promise<{ account_id: string }>;
}

export default async function AccountRedirectPage({
  params,
}: AccountRedirectPageProps) {
  const { account_id } = await params;

  // Redirect to the profile page as the default account settings page
  redirect(editAccountProfileUrl(account_id));
}
