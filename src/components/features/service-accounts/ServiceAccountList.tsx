import { Flex, Text } from "@radix-ui/themes";
import { CubeIcon } from "@radix-ui/react-icons";
import {
  RowList,
  RowMarker,
  ListRow,
} from "@/components/core/ListRow";
import { editServiceAccountUrl } from "@/lib/urls";
import { isKeyActive, type ServiceAccountSummary } from "@/types";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * An owner's service accounts, one row each: who it is, whether it is
 * disabled, and how many workflows, live API keys and products it has. Everything that changes an
 * account is on its own page, a click away.
 */
export function ServiceAccountList({ summaries }: { summaries: ServiceAccountSummary[] }) {
  if (summaries.length === 0) {
    return (
      <Flex direction="column" align="center" gap="2" py="8" style={{ userSelect: "none" }}>
        <CubeIcon width="48" height="48" color="var(--gray-8)" />
        <Text size="4" weight="medium" color="gray">
          No service accounts yet
        </Text>
        <Text size="2" color="gray">
          Create one for a nightly sync, a publishing pipeline, or an instrument.
        </Text>
      </Flex>
    );
  }
  return (
    <RowList>
      {summaries.map(({ account, trusts, grants, keys }) => {
        const liveKeys = keys.filter((k) => !k.revoked_at && isKeyActive(k)).length;
        return (
        <ListRow
          key={account.account_id}
          href={editServiceAccountUrl(account.owner_account_id, account.account_id)}
          title={
            <Text size="2" weight="medium">
              {account.name}
            </Text>
          }
          markers={account.disabled && <RowMarker>Disabled</RowMarker>}
          meta={account.account_id}
          aside={
            <Flex direction="column" align="end">
              {[
                count(trusts.length, "workflow", "workflows"),
                count(liveKeys, "API key", "API keys"),
                count(grants.length, "product", "products"),
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
    </RowList>
  );
}
