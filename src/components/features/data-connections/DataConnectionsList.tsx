import { Text, Flex } from "@radix-ui/themes";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { Account, DataConnection, DataProvider } from "@/types";
import { AccountInfoHoverCard } from "@/components/core/AccountInfoHoverCard";
import { MonoText } from "@/components/core/MonoText";
import { accountUrl } from "@/lib/urls";
import {
  ConnectionRow,
  ConnectionMarker,
  ConnectionsEmpty,
} from "./ConnectionRow";

const PROVIDER_LABEL: Record<DataProvider, string> = {
  [DataProvider.S3]: "s3",
  [DataProvider.Azure]: "azure",
  [DataProvider.GCS]: "gcs",
};

/** GCS federates without a key, so it has no region to show. */
function storageSummary(connection: DataConnection): string {
  const provider = PROVIDER_LABEL[connection.details.provider];
  const region =
    "region" in connection.details ? connection.details.region : undefined;
  return region ? `${provider} · ${region}` : provider;
}

interface DataConnectionsListProps {
  connections: DataConnection[];
  /** Link target for a connection's edit page (admin- or account-scoped). */
  editHref: (dataConnectionId: string) => string;
  /**
   * Owner accounts keyed by `account_id`. Pass this (admin view) to distinguish
   * system-owned (unowned) connections from account-owned ones. Omit it
   * (account-scoped view), where every connection has the same owner.
   */
  ownerAccounts?: Record<string, Account>;
}

/** Owner label: system when unowned, hover-carded account otherwise. */
function OwnerLabel({
  owner,
  ownerAccounts,
}: {
  owner?: string;
  ownerAccounts: Record<string, Account>;
}) {
  if (!owner) {
    return <ConnectionMarker>System</ConnectionMarker>;
  }

  const account = ownerAccounts[owner];
  if (!account) {
    // Owner id with no loadable account (e.g. deleted). Show the raw id.
    return (
      <MonoText size="1" color="gray">
        {owner}
      </MonoText>
    );
  }

  return (
    <AccountInfoHoverCard account={account}>
      <Link
        href={accountUrl(account.account_id)}
        style={{ color: "var(--accent-11)" }}
      >
        <Text size="1">{account.name}</Text>
      </Link>
    </AccountInfoHoverCard>
  );
}

/**
 * The connections belonging to an account, or all of them in the admin view.
 *
 * Rendered with the same row as a product's connections. It was a table, which
 * made two lists of the same entity look like different kinds of thing — and a
 * table left nowhere to put a per-row action, so the name was the only way in.
 */
export function DataConnectionsList({
  connections,
  editHref,
  ownerAccounts,
}: DataConnectionsListProps) {
  if (connections.length === 0) {
    return (
      <ConnectionsEmpty>Create a data connection to get started.</ConnectionsEmpty>
    );
  }

  return (
    <Flex direction="column" gap="3">
      {connections.map((conn) => (
        <ConnectionRow
          key={conn.data_connection_id}
          title={
            <Link
              href={editHref(conn.data_connection_id)}
              style={{ color: "var(--accent-11)" }}
            >
              <Text size="2" weight="medium">
                {conn.name}
              </Text>
            </Link>
          }
          markers={
            <>
              {/* Read-only is a deliberate configuration, not a fault, so it is
                  marked where true and unmentioned where false. */}
              {conn.read_only && <ConnectionMarker>Read only</ConnectionMarker>}
              {ownerAccounts && (
                <OwnerLabel owner={conn.owner} ownerAccounts={ownerAccounts} />
              )}
            </>
          }
          meta={`${conn.data_connection_id} · ${storageSummary(conn)}`}
          actions={
            <Flex align="center" gap="3">
              <Flex gap="1" wrap="wrap" justify="end">
                {conn.allowed_visibilities.length === 0 ? (
                  <Text size="1" color="gray">
                    permits nothing
                  </Text>
                ) : (
                  conn.allowed_visibilities.map((visibility) => (
                    <ConnectionMarker key={visibility}>
                      {visibility}
                    </ConnectionMarker>
                  ))
                )}
              </Flex>
              <ChevronRightIcon color="var(--gray-9)" />
            </Flex>
          }
        />
      ))}
    </Flex>
  );
}
