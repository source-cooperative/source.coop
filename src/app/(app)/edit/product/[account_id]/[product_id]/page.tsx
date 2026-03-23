import { redirect } from "next/navigation";
import { editProductDetailsUrl } from "@/lib/urls";

interface ProductSettingsPageProps {
  params: Promise<{ account_id: string; product_id: string }>;
}

export default async function ProductSettingsPage({
  params,
}: ProductSettingsPageProps) {
  const { account_id, product_id } = await params;

  // Redirect to the most commonly permitted view (product details)
  redirect(editProductDetailsUrl(account_id, product_id));
}
