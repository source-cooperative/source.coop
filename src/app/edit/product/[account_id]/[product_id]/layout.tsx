import { ReactNode } from "react";
import { SettingsLayout } from "@/components/features/settings";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, Product } from "@/types";
import { productsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";
import { CONFIG } from "@/lib/config";
import {
  LockClosedIcon,
  GlobeIcon,
  ArchiveIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import { AvatarLinkCompact, MonoText } from "@/components";
import {
  accountUrl,
  productUrl,
  editProductDetailsUrl,
  editProductAccessUrl,
  editProductVisibilityUrl,
  editProductArchiveUrl,
} from "@/lib/urls";
import { Box, Flex, Text, Button } from "@radix-ui/themes";
import Link from "next/link";

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

  const canEditProduct = isAuthorized(session, product, Actions.PutRepository);
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
      id: "details",
      label: "Details",
      href: editProductDetailsUrl(account_id, product_id),
      icon: <Pencil1Icon width="16" height="16" />,
      condition: canEditProduct,
    },
    {
      id: "access",
      label: "Access",
      href: editProductAccessUrl(account_id, product_id),
      icon: <LockClosedIcon width="16" height="16" />,
      condition: canReadMembership,
    },
    {
      id: "visibility",
      label: "Visibility",
      href: editProductVisibilityUrl(account_id, product_id),
      icon: <GlobeIcon width="16" height="16" />,
      condition: canReadProduct,
    },
    {
      id: "archive",
      label: "Archive",
      href: editProductArchiveUrl(account_id, product_id),
      icon: <ArchiveIcon width="16" height="16" />,
      condition: canUpdateProduct,
    },
  ];

  return (
    <>
      <ProductHeader product={product} />
      <SettingsLayout menuItems={menuItems}>{children}</SettingsLayout>
    </>
  );
}

function ProductHeader({ product }: { product: Product }) {
  return (
    <Box mb="5" pb="4" style={{ borderBottom: "1px solid var(--gray-6)" }}>
      <Flex align="center" gap="3">
        <AvatarLinkCompact account={product.account!} />
        <Text size="2" color="gray" style={{ userSelect: "none" }}>
          &gt;
        </Text>
        <Button variant="ghost" asChild>
          <Link href={productUrl(product.account_id, product.product_id)}>
            <MonoText>{product.product_id}</MonoText>
          </Link>
        </Button>
      </Flex>
    </Box>
  );
}
