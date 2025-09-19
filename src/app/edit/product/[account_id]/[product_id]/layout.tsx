import { ReactNode } from "react";
import { SettingsLayout } from "@/components/features/settings";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";
import { productsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { LockClosedIcon, GlobeIcon, ArchiveIcon } from "@radix-ui/react-icons";

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

  const canReadProduct = isAuthorized(session, product, Actions.GetRepository);
  const canReadMembership = isAuthorized(
    session,
    product,
    Actions.GetMembership
  );
  const canUpdateProduct = isAuthorized(
    session,
    product,
    Actions.PutRepository
  );

  const menuItems = [
    {
      id: "access",
      label: "Access",
      href: `/edit/product/${account_id}/${product_id}/access`,
      icon: <LockClosedIcon width="16" height="16" />,
      condition: canReadMembership,
    },
    {
      id: "visibility",
      label: "Visibility",
      href: `/edit/product/${account_id}/${product_id}/visibility`,
      icon: <GlobeIcon width="16" height="16" />,
      condition: canReadProduct,
    },
    {
      id: "archive",
      label: "Archive",
      href: `/edit/product/${account_id}/${product_id}/archive`,
      icon: <ArchiveIcon width="16" height="16" />,
      condition: canUpdateProduct,
    },
  ];

  return (
    <SettingsLayout
      menuItems={menuItems}
      showHeader={false}
      sidebarTitle="Product Settings"
    >
      {children}
    </SettingsLayout>
  );
}
