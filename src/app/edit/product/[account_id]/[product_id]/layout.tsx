import { ReactNode } from "react";
import { Pencil1Icon, PersonIcon } from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";
import {
  SettingsLayout,
  ProductSelector,
  SettingsHeader,
  AccountSelector,
} from "@/components/features/settings";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";
import { productsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { ExternalLink } from "@/components";
import {
  productUrl,
  editProductDetailsUrl,
  editProductMembershipsUrl,
} from "@/lib/urls";
import { getManageableAccounts } from "@/lib/clients/lookups";

interface ProductLayoutProps {
  children: ReactNode;
  params: Promise<{ account_id: string; product_id: string }>;
}

export default async function ProductLayout({
  children,
  params,
}: ProductLayoutProps) {
  const { account_id, product_id } = await params;

  const session = await getPageSession();

  if (!session?.account) {
    redirect(CONFIG.auth.routes.login);
  }

  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    notFound();
  }

  // Check if user is authorized for the required permission
  if (!isAuthorized(session, product, Actions.PutRepository)) {
    notFound();
  }

  const manageableAccounts = await getManageableAccounts(session.account);

  // Get manageable products for the dropdown
  // Fetch all products for this account that the user can manage
  let { products: manageableProducts } = await productsTable.listByAccount(
    account_id
  );
  manageableProducts = manageableProducts.filter((p) =>
    isAuthorized(session, p, Actions.PutRepository)
  );

  const canEditProduct = isAuthorized(session, product, Actions.PutRepository);
  const canReadMembership = isAuthorized(
    session,
    product,
    Actions.ListRepositoryMemberships
  );

  const menuItems = [
    {
      id: "details",
      label: "Details",
      href: editProductDetailsUrl(account_id, product_id),
      icon: <Pencil1Icon width="16" height="16" />,
      condition: canEditProduct,
    },
    {
      id: "memberships",
      label: "Memberships",
      href: editProductMembershipsUrl(account_id, product_id),
      icon: <PersonIcon width="16" height="16" />,
      condition: canReadMembership,
    },
  ];

  return (
    <>
      <SettingsHeader>
        <Flex align="center" gap="4">
          <AccountSelector
            currentAccount={product.account!}
            manageableAccounts={manageableAccounts}
          />
          <ProductSelector
            currentProduct={product}
            manageableProducts={manageableProducts}
          />
        </Flex>

        <ExternalLink href={productUrl(product.account_id, product.product_id)}>
          View Product
        </ExternalLink>
      </SettingsHeader>
      <SettingsLayout menuItems={menuItems}>{children}</SettingsLayout>
    </>
  );
}
