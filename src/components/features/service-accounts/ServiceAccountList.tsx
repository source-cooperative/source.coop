import { Flex, Text } from "@radix-ui/themes";
import { CubeIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { ItemList } from "@/components/core/ItemList";
import { editServiceAccountUrl } from "@/lib/urls";
import { isKeyActive, type ServiceAccountSummary } from "@/types";

/**
 * An owner's service accounts, one row each: who it is, whether it is
 * disabled, and how many workflows, live API keys and products it has. Everything that changes an
 * account is on its own page, a click away.
 */
export function ServiceAccountList({ summaries }: { summaries: ServiceAccountSummary[] }) {
  const t = useTranslations("ServiceAccountList");
  if (summaries.length === 0) {
    return (
      <Flex direction="column" align="center" gap="2" py="8" style={{ userSelect: "none" }}>
        <CubeIcon width="48" height="48" color="var(--gray-8)" />
        <Text size="4" weight="medium" color="gray">
          {t("emptyTitle")}
        </Text>
        <Text size="2" color="gray">
          {t("emptyBody")}
        </Text>
      </Flex>
    );
  }
  return (
    <ItemList.Root>
      {summaries.map(({ account, trusts, grants, keys }) => {
        const liveKeys = keys.filter((k) => !k.revoked_at && isKeyActive(k)).length;
        return (
        <ItemList.Row
          key={account.account_id}
          href={editServiceAccountUrl(account.owner_account_id, account.account_id)}
          title={
            <Text size="2" weight="medium">
              {account.name}
            </Text>
          }
          markers={account.disabled && <ItemList.Marker>{t("disabled")}</ItemList.Marker>}
          meta={account.account_id}
          aside={
            <Flex direction="column" align="end">
              {[
                t("workflows", { count: trusts.length }),
                t("apiKeys", { count: liveKeys }),
                t("products", { count: grants.length }),
              ].map((line) => (
                <Text key={line} size="1" color="gray">
                  {line}
                </Text>
              ))}
            </Flex>
          }
        />
        );
      })}
    </ItemList.Root>
  );
}
