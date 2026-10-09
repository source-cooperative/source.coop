import { DataList, Badge } from "@radix-ui/themes";
import type { Product } from "@/types";
import { AvatarLinkCompact } from "@/components/core";
import { DateText } from "@/components/display";
import { useTranslations } from "next-intl";

interface ProductMetaContentProps {
  product: Product;
}

export function ProductMetaContent({ product }: ProductMetaContentProps) {
  const t = useTranslations("ProductMetaContent");
  return (
    <DataList.Root>
      <DataList.Item>
        <DataList.Label>{t("visibility")}</DataList.Label>
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
              ? t("public")
              : product.visibility === "unlisted"
              ? t("unlisted")
              : t("restricted")}
          </Badge>
        </DataList.Value>
      </DataList.Item>

      <DataList.Item style={{ alignItems: "center" }}>
        <DataList.Label>{t("owner")}</DataList.Label>
        <DataList.Value>
          <AvatarLinkCompact account={product.account!} />
        </DataList.Value>
      </DataList.Item>

      <DataList.Item>
        <DataList.Label>{t("created")}</DataList.Label>
        <DataList.Value>
          <DateText date={product.created_at} />
        </DataList.Value>
      </DataList.Item>

      <DataList.Item>
        <DataList.Label>{t("lastUpdated")}</DataList.Label>
        <DataList.Value>
          <DateText date={product.updated_at} />
        </DataList.Value>
      </DataList.Item>
    </DataList.Root>
  );
}
