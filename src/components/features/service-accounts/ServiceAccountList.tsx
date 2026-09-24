import Link from "next/link";
import { Flex, Text } from "@radix-ui/themes";
import { ChevronRightIcon, CubeIcon } from "@radix-ui/react-icons";
import {
  ConnectionList,
  ConnectionMarker,
  ConnectionRow,
} from "@/components/features/data-connections/ConnectionRow";
import { editServiceAccountUrl } from "@/lib/urls";
import type { ServiceAccountSummary } from "@/types";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * An owner's service accounts, one row each: who it is, whether it is
 * disabled, and how much it trusts and reaches. Everything that changes an
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
    <ConnectionList>
      {summaries.map(({ account, trusts, grants }) => (
        <ConnectionRow
          key={account.account_id}
          title={
            <Link
              href={editServiceAccountUrl(account.owner_account_id, account.account_id)}
              style={{ color: "var(--accent-11)", textDecoration: "none" }}
            >
              <Text size="2" weight="medium">
                {account.name}
              </Text>
            </Link>
          }
          markers={account.disabled && <ConnectionMarker>Disabled</ConnectionMarker>}
          meta={account.account_id}
          aside={
            <Text size="1" color="gray">
              {trusts.length === 0
                ? "cannot sign in"
                : count(trusts.length, "workflow", "workflows")}{" "}
              · {count(grants.length, "product", "products")}
            </Text>
          }
          actions={<ChevronRightIcon color="var(--gray-9)" />}
        />
      ))}
    </ConnectionList>
  );
}
