import { Text } from "@radix-ui/themes";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { Account, DataConnection, DataProvider } from "@/types";
import { AccountInfoHoverCard } from "@/components/core/AccountInfoHoverCard";
import { accountUrl } from "@/lib/urls";
import {
  ConnectionList,
  ConnectionRow,
  ConnectionMarker,
  ConnectionsEmpty,
} from "./ConnectionRow";

const PROVIDER_LABEL: Record<DataProvider, string> = {
  [DataProvider.S3]: "s3",
  [DataProvider.Azure]: "azure",
  [DataProvider.GCS]: "gcs",
};

/**
 * Where a connection points, in the order you would ask it: which backend,
 * which bucket, which region.
 *
 * Azure addresses a container inside a storage account, so it takes both to
 * name what one bucket names elsewhere -- written the way the connection
 * form's worked example writes it. GCS federates without a key, so it has no
 * region to show.
 *
 * The connection id is deliberately gone: it is slugified from the name
 * directly above it, so it restated what the row already said.
 */
function metaFor(connection: DataConnection): string {
  const { details } = connection;
  const provider = PROVIDER_LABEL[details.provider];
  const bucket =
    details.provider === DataProvider.Azure
      ? `${details.account_name}/${details.container_name}`
      : details.bucket;
  const region = "region" in details ? details.region : undefined;
  return [provider, bucket, region].filter(Boolean).join(" · ");
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

/**
 * Who owns a connection, as quiet text on the identifier line.
 *
 * Not a chip: ownership is an attribute, and giving it the same outlined box as
 * a state left four indistinguishable labels competing on every row.
 */
function OwnerLabel({
  owner,
  ownerAccounts,
}: {
  owner?: string;
  ownerAccounts: Record<string, Account>;
}) {
  if (!owner) {
    return <>system</>;
  }

  const account = ownerAccounts[owner];
  if (!account) {
    // Owner id with no loadable account (e.g. deleted). Show the raw id.
    return <>{owner}</>;
  }

  return (
    <AccountInfoHoverCard account={account}>
      <Link
        href={accountUrl(account.account_id)}
        style={{ color: "var(--accent-11)" }}
      >
        {account.name}
      </Link>
    </AccountInfoHoverCard>
  );
}

/**
 * The connections belonging to an account, or all of them in the admin view.
 *
 * Shares its row with a product's connections, so two lists of the same thing
 * do not look like different kinds of object.
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
    <ConnectionList>
      {connections.map((conn) => (
        <ConnectionRow
          key={conn.data_connection_id}
          title={
            <Link
              href={editHref(conn.data_connection_id)}
              style={{ color: "var(--accent-11)", textDecoration: "none" }}
            >
              <Text size="2" weight="medium">
                {conn.name}
              </Text>
            </Link>
          }
          markers={
            // The one state here worth marking. Read-only is deliberate, not a
            // fault, so it is marked where true and unmentioned where false.
            conn.read_only && <ConnectionMarker>Read only</ConnectionMarker>
          }
          meta={
            <>
              {metaFor(conn)}
              {ownerAccounts && (
                <>
                  {" · "}
                  <OwnerLabel
                    owner={conn.owner}
                    ownerAccounts={ownerAccounts}
                  />
                </>
              )}
            </>
          }
          aside={
            <Text size="1" color="gray">
              {conn.allowed_visibilities.length === 0
                ? "permits nothing"
                : conn.allowed_visibilities.join(", ")}
            </Text>
          }
          actions={<ChevronRightIcon color="var(--gray-9)" />}
        />
      ))}
    </ConnectionList>
  );
}
