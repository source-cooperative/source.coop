import { AccountDropdown } from "./AccountDropdown";
import { getPageSession } from "@/lib/api/utils";
import {
  accountsTable,
  isOrganizationalAccount,
  productsTable,
} from "@/lib/clients/database";
import { Button, Callout, Link } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { MembershipState } from "@/types";
import { loginUrl, onboardingUrl } from "@/lib/urls";
import { getReturnToUrl } from "@/lib/baseUrl";

export async function AuthButtons() {
  const session = await getPageSession();

  if (session?.account) {
    // Organizations the user belongs to (memberships carry only ids → resolve
    // the org accounts for their display names) and the products they own.
    // Only accepted memberships count — an outstanding invite (state Invited)
    // must not show as an org the user already belongs to.
    const [organizations, { products }] = await Promise.all([
      accountsTable
        .fetchManyByIds(
          (session.memberships ?? [])
            .filter((m) => m.state === MembershipState.Member)
            .map((m) => m.membership_account_id)
        )
        .then((accounts) =>
          accounts.filter(isOrganizationalAccount).map((a) => ({
            account_id: a.account_id,
            name: a.name,
          }))
        ),
      productsTable.listByAccount(session.account.account_id, 5),
    ]);

    return (
      <AccountDropdown
        session={session}
        organizations={organizations}
        products={products.map((p) => ({
          account_id: p.account_id,
          product_id: p.product_id,
          title: p.title,
        }))}
      />
    );
  }

  if (session && !session.account) {
    return (
      <Callout.Root color="yellow">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          You do not yet have a profile. Please click{" "}
          <Link href={onboardingUrl()}>here</Link> to complete your profile.
        </Callout.Text>
      </Callout.Root>
    );
  }

  const returnTo = await getReturnToUrl();

  return (
    <Link href={loginUrl(returnTo)}>
      <Button>Log In / Register</Button>
    </Link>
  );
}
