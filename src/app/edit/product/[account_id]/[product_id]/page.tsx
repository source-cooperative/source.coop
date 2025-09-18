import { redirect } from "next/navigation";

interface ProductSettingsPageProps {
  params: Promise<{ account_id: string; product_id: string }>;
}

export default async function ProductSettingsPage({
  params,
}: ProductSettingsPageProps) {
  const { account_id, product_id } = await params;

  // Redirect to the first available view (access)
  redirect(`/edit/product/${account_id}/${product_id}/access`);
}
