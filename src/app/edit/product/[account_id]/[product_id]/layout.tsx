import { ReactNode } from "react";
import { ProductSettingsLayoutWrapper } from "@/components/features/settings/ProductSettingsLayoutWrapper";
import { Actions } from "@/types";

interface ProductLayoutProps {
  children: ReactNode;
  params: Promise<{ account_id: string; product_id: string }>;
}

export default async function ProductLayout({
  children,
  params,
}: ProductLayoutProps) {
  const { account_id, product_id } = await params;

  return (
    <ProductSettingsLayoutWrapper
      accountId={account_id}
      productId={product_id}
      requiredPermission={Actions.PutRepository}
    >
      {children}
    </ProductSettingsLayoutWrapper>
  );
}
