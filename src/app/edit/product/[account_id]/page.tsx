import { redirect } from "next/navigation";
import { editAccountProfileUrl } from "@/lib/urls";

interface ProductRedirectPageProps {
  params: Promise<{ account_id: string }>;
}

export default async function ProductRedirectPage({
  params,
}: ProductRedirectPageProps) {
  const { account_id } = await params;

  // Redirect to the account edit view since no product_id was provided
  redirect(editAccountProfileUrl(account_id));
}
