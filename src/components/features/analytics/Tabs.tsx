import Link from "next/link";
import { Box, Flex, Text, Tooltip } from "@radix-ui/themes";
import { LockClosedIcon } from "@radix-ui/react-icons";
import {
  accountAnalyticsUrl,
  accountUrl,
  productAnalyticsUrl,
  productUrl,
} from "@/lib/urls";

const label = (active: boolean): React.CSSProperties => ({
  fontFamily: "var(--code-font-family)",
  letterSpacing: "0.03em",
  color: active ? "var(--gray-12)" : "var(--gray-10)",
});

interface TabsProps {
  /** The public view's tab: its label and href */
  scope: { text: string; href: string };
  analyticsHref: string;
  /** Tooltip on the padlock: who the analytics tab is visible to */
  restrictedTo: string;
  active: "scope" | "analytics";
}

/** SCOPE | ANALYTICS strip; the analytics route 404s anyone who can't see it. */
function Tabs({ scope, analyticsHref, restrictedTo, active }: TabsProps) {
  const tabs = [
    { key: "scope", text: scope.text, href: scope.href },
    { key: "analytics", text: "ANALYTICS", href: analyticsHref },
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
            <Flex align="center" gap="1">
              {tab.key === "analytics" && (
                <Tooltip content={restrictedTo}>
                  <LockClosedIcon
                    width="11"
                    height="11"
                    color="var(--gray-9)"
                    aria-label="Restricted"
                  />
                </Tooltip>
              )}
              <Text
                size="1"
                weight={tab.key === active ? "bold" : "regular"}
                style={label(tab.key === active)}
              >
                {tab.text}
              </Text>
            </Flex>
          </Box>
        </Link>
      ))}
    </Flex>
  );
}

/**
 * PRODUCT | ANALYTICS strip shown at the product root to viewers who can
 * manage the product.
 */
export function ProductTabs({
  accountId,
  productId,
  active,
}: {
  accountId: string;
  productId: string;
  active: "product" | "analytics";
}) {
  return (
    <Tabs
      scope={{ text: "PRODUCT", href: productUrl(accountId, productId) }}
      analyticsHref={productAnalyticsUrl(accountId, productId)}
      restrictedTo="Visible only to this product's owners, maintainers, and site admins."
      active={active === "product" ? "scope" : "analytics"}
    />
  );
}

/**
 * PROFILE | ANALYTICS strip shown on an account profile to viewers who can
 * manage the account.
 */
export function AccountTabs({
  accountId,
  active,
}: {
  accountId: string;
  active: "profile" | "analytics";
}) {
  return (
    <Tabs
      scope={{ text: "PROFILE", href: accountUrl(accountId) }}
      analyticsHref={accountAnalyticsUrl(accountId)}
      restrictedTo="Visible only to this account's owners, maintainers, and site admins."
      active={active === "profile" ? "scope" : "analytics"}
    />
  );
}
