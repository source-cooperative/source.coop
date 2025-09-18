import { ReactNode } from "react";
import { ProductSettingsLayout } from "@/components/features/settings";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";
import { productsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";

interface ProductLayoutProps {
  children: ReactNode;
  params: { account_id: string; product_id: string };
}

export default async function ProductLayout({
  children,
  params,
}: ProductLayoutProps) {
  const { account_id, product_id } = await params;

  const session = await getPageSession();

  if (!session?.account) {
    redirect("/auth/login");
  }

  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    notFound();
  }

  // Check if user is authorized for the required permission
  if (!isAuthorized(session, product, Actions.PutRepository)) {
    notFound();
  }

  return (
    <ProductSettingsLayout
      accountId={account_id}
      productId={product_id}
      canReadProduct={isAuthorized(session, product, Actions.GetRepository)}
      canReadMembership={isAuthorized(session, product, Actions.GetMembership)}
      canUpdateProduct={isAuthorized(session, product, Actions.PutRepository)}
    >
      {children}
    </ProductSettingsLayout>
  );
}