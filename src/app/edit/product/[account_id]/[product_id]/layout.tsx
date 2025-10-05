import { ReactNode } from "react";
import { SettingsLayout } from "@/components/features/settings";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, Product } from "@/types";
import { productsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { Pencil1Icon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { AvatarLinkCompact, MonoText } from "@/components";
import { productUrl, editProductDetailsUrl } from "@/lib/urls";
import { Box, Flex, Text, Button, Link as RadixLink } from "@radix-ui/themes";
import Link from "next/link";

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

  const canEditProduct = isAuthorized(session, product, Actions.PutRepository);

  const menuItems = [
    {
      id: "details",
      label: "Details",
      href: editProductDetailsUrl(account_id, product_id),
      icon: <Pencil1Icon width="16" height="16" />,
      condition: canEditProduct,
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
      <Flex justify="between" align="center">
        {/* Left side - Product account and id */}H
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
        {/* Right side - Link to product */}
        <RadixLink href={productUrl(product.account_id, product.product_id)}>
          <Flex align="center" gap="2">
            <Text size="1">View Product</Text>
            <ExternalLinkIcon width="14" height="14" />
          </Flex>
        </RadixLink>
      </Flex>
    </Box>
  );
}
