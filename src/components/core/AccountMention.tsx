import Link from "next/link";
import type { PublicAccount } from "@/types";
import { AccountInfoHoverCard } from "./AccountInfoHoverCard";
import { accountUrl } from "@/lib/urls";

/** Account ids the page looked up, to the accounts they name. */
export type AccountsById = Record<string, PublicAccount>;

/**
 * An account named by id in running text, such as "Suggested by alukach",
 * linked to its profile with the account card on hover. An id the page
 * couldn't look up, such as a deleted account's, shows as plain text.
 */
export function AccountMention({
  id,
  accounts = {},
}: {
  id: string;
  accounts?: AccountsById;
}) {
  const account = accounts[id];
  if (!account) return <>{id}</>;
  return (
    <AccountInfoHoverCard account={account}>
      <Link href={accountUrl(id)} style={{ color: "inherit" }}>
        {id}
      </Link>
    </AccountInfoHoverCard>
  );
}
