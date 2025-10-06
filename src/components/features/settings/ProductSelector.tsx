"use client";

import { useState } from "react";
import { Flex, Text, DropdownMenu } from "@radix-ui/themes";
import Link from "next/link";
import { Product } from "@/types";
import { MonoText } from "@/components";
import { editProductViewUrl } from "@/lib/urls";
import { ChevronIcon } from "@/components/icons";
import { usePathname } from "next/navigation";

interface ProductSelectorProps {
  currentProduct: Product;
  manageableProducts: Product[];
}

export function ProductSelector({
  currentProduct,
  manageableProducts,
}: ProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Extract current view from pathname (last segment)
  const pathParts = pathname.split("/");
  const currentView = pathParts[pathParts.length - 1];

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger>
        <Flex align="center" gap="2" style={{ cursor: "pointer" }}>
          <ProductDisplay product={currentProduct} />
          <ChevronIcon isOpen={isOpen} />
        </Flex>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content variant="soft">
        {manageableProducts.map((product) => (
          <DropdownMenu.Item key={product.product_id}>
            <Link
              href={editProductViewUrl(
                product.account_id,
                product.product_id,
                currentView
              )}
              onClick={() => setIsOpen(false)}
            >
              <ProductDisplay
                product={product}
                selected={product.product_id === currentProduct.product_id}
              />
            </Link>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

function ProductDisplay({
  product,
  selected,
}: {
  product: Product;
  selected?: boolean;
}) {
  return (
    <Text size="2" color="gray" weight={selected ? "bold" : "regular"}>
      {product.title}
    </Text>
  );
}
