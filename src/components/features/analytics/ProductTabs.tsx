import Link from "next/link";
import { Box, Flex, Text } from "@radix-ui/themes";
import { productAnalyticsUrl, productUrl } from "@/lib/urls";

interface ProductTabsProps {
  accountId: string;
  productId: string;
  active: "product" | "analytics";
}

const label = (active: boolean): React.CSSProperties => ({
  fontFamily: "var(--code-font-family)",
  letterSpacing: "0.03em",
  color: active ? "var(--gray-12)" : "var(--gray-10)",
});

/**
 * PRODUCT | ANALYTICS strip shown at the product root to viewers who can
 * manage the product (the analytics route 404s everyone else).
 */
export function ProductTabs({ accountId, productId, active }: ProductTabsProps) {
  const tabs = [
    { key: "product", text: "PRODUCT", href: productUrl(accountId, productId) },
    {
      key: "analytics",
      text: "ANALYTICS",
      href: productAnalyticsUrl(accountId, productId),
    },
  ] as const;

  return (
    <Flex gap="5" style={{ borderBottom: "1px solid var(--gray-4)" }}>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Box
            pb="2"
            style={{
              borderBottom:
                tab.key === active
                  ? "2px solid var(--gray-12)"
                  : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            <Text
              size="1"
              weight={tab.key === active ? "bold" : "regular"}
              style={label(tab.key === active)}
            >
              {tab.text}
            </Text>
          </Box>
        </Link>
      ))}
    </Flex>
  );
}
