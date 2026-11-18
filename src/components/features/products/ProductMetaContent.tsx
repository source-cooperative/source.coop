import { DataList, Badge } from "@radix-ui/themes";
import type { Product } from "@/types";
import { AvatarLinkCompact } from "@/components/core";
import { DateText } from "@/components/display";
import { ProductObjectsUpdated } from "./ProductObjectsUpdated";

interface ProductMetaContentProps {
  product: Product;
}

export function ProductMetaContent({ product }: ProductMetaContentProps) {
  return (
    <DataList.Root>
      <DataList.Item>
        <DataList.Label>Visibility</DataList.Label>
        <DataList.Value>
          <Badge
            color={
              product.visibility === "public"
                ? "green"
                : product.visibility === "unlisted"
                ? "yellow"
                : "red"
            }
          >
            {product.visibility === "public"
              ? "Public"
              : product.visibility === "unlisted"
              ? "Unlisted"
              : "Restricted"}
          </Badge>
        </DataList.Value>
      </DataList.Item>

      <DataList.Item style={{ alignItems: "center" }}>
        <DataList.Label>Owner</DataList.Label>
        <DataList.Value>
          <AvatarLinkCompact account={product.account!} />
        </DataList.Value>
      </DataList.Item>

      <DataList.Item>
        <DataList.Label>Created</DataList.Label>
        <DataList.Value>
          <DateText date={product.created_at} />
        </DataList.Value>
      </DataList.Item>

      <DataList.Item>
        <DataList.Label>Metadata Updated</DataList.Label>
        <DataList.Value>
          <DateText date={product.updated_at} />
        </DataList.Value>
      </DataList.Item>

      <ProductObjectsUpdated
        accountId={product.account_id}
        productId={product.product_id}
      />
    </DataList.Root>
  );
}
