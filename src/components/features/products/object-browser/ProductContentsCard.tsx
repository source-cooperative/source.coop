import { Box, Card, Flex } from "@radix-ui/themes";
import { BreadcrumbNav } from "@/components/display/BreadcrumbNav";
import { SectionHeader } from "@/components/core/SectionHeader";
import { FetchCredentialsButton } from "@/components/features/uploader/FetchCredentialsButton";
import { productUrl } from "@/lib/urls";
import { RefreshListingButton } from "./RefreshListingButton";
import { useTranslations } from "next-intl";

interface ProductContentsCardProps {
  accountId: string;
  productId: string;
  /** Decoded path segments of the current prefix. */
  path: string[];
  /** Where uploads land; passed through from the route as-is. */
  prefix: string;
  canWriteData: boolean;
  /** The listing or object preview at `path`. */
  children: React.ReactNode;
}

export function ProductContentsCard({
  accountId,
  productId,
  path,
  prefix,
  canWriteData,
  children,
}: ProductContentsCardProps) {
  const t = useTranslations("ProductContentsCard");
  return (
    <Card>
      <SectionHeader
        title={t("contents")}
        rightButton={
          <Flex gap="3" align="center">
            <RefreshListingButton />
            {canWriteData && (
              <FetchCredentialsButton
                scope={{ accountId, productId }}
                prefix={prefix}
              />
            )}
          </Flex>
        }
      >
        <Box
          pb="3"
          mb="3"
          style={{
            borderBottom: "1px solid var(--gray-5)",
          }}
        >
          <BreadcrumbNav
            path={path}
            baseUrl={productUrl(accountId, productId)}
          />
        </Box>
      </SectionHeader>
      {children}
    </Card>
  );
}
