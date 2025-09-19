import { redirect } from "next/navigation";
import { editProductAccessUrl } from "@/lib/urls";

interface ProductSettingsPageProps {
  params: Promise<{ account_id: string; product_id: string }>;
}

export default async function ProductSettingsPage({
  params,
}: ProductSettingsPageProps) {
  const { account_id, product_id } = await params;

  // Redirect to the first available view (access)
  redirect(editProductAccessUrl(account_id, product_id));
}
