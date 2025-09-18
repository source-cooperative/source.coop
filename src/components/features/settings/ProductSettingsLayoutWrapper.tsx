import { ReactNode } from "react";
import { ProductSettingsLayout } from "./ProductSettingsLayout";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";
import { productsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";

interface ProductSettingsLayoutWrapperProps {
  children: ReactNode;
  accountId: string;
  productId: string;
  requiredPermission: Actions;
}

export async function ProductSettingsLayoutWrapper({
  children,
  accountId,
  productId,
  requiredPermission,
}: ProductSettingsLayoutWrapperProps) {
  const session = await getPageSession();
  
  if (!session?.account) {
    redirect("/auth/login");
  }

  const product = await productsTable.fetchById(accountId, productId);
  if (!product) {
    notFound();
  }

  // Check if user is authorized for the required permission
  if (!isAuthorized(session, product, requiredPermission)) {
    notFound();
  }

  return (
    <ProductSettingsLayout
      accountId={accountId}
      productId={productId}
      canReadProduct={isAuthorized(session, product, Actions.GetRepository)}
      canReadMembership={isAuthorized(session, product, Actions.GetMembership)}
      canUpdateProduct={isAuthorized(session, product, Actions.PutRepository)}
    >
      {children}
    </ProductSettingsLayout>
  );
}
