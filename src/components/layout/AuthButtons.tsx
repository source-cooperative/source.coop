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
import { invitationLink } from "./accountMenu";

export async function AuthButtons() {
  const session = await getPageSession();

  if (session?.account) {
    const memberships = session.memberships ?? [];
    // Accepted org memberships vs outstanding invites: an invite must not read
    // as an org the user already belongs to — it goes in "Invitations" instead.
    const memberOrgIds = new Set(
      memberships
        .filter((m) => m.state === MembershipState.Member)
        .map((m) => m.membership_account_id)
    );
    const invited = memberships.filter(
      (m) => m.state === MembershipState.Invited
    );

    const [accounts, { products }, invitedProducts] = await Promise.all([
      // One batched account read resolves both member-org and invite-org names.
      accountsTable.fetchManyByIds([
        ...memberOrgIds,
        ...invited.map((m) => m.membership_account_id),
      ]),
      productsTable.listByAccount(session.account.account_id, 20),
      // Product invites need the product title; usually there are none.
      Promise.all(
        invited
          .filter((m) => m.repository_id)
          .map((m) =>
            productsTable.fetchById(m.membership_account_id, m.repository_id!)
          )
      ),
    ]);

    const accountsById = new Map(accounts.map((a) => [a.account_id, a]));
    const productTitleByKey = new Map<string, string>();
    for (const p of invitedProducts) {
      if (p) productTitleByKey.set(`${p.account_id}/${p.product_id}`, p.title);
    }

    const organizations = accounts
      .filter((a) => memberOrgIds.has(a.account_id) && isOrganizationalAccount(a))
      .map((a) => ({ account_id: a.account_id, name: a.name }));

    const pendingInvitations = invited.map((m) =>
      invitationLink(m, {
        organizationName: accountsById.get(m.membership_account_id)?.name,
        productTitle: m.repository_id
          ? productTitleByKey.get(`${m.membership_account_id}/${m.repository_id}`)
          : undefined,
      })
    );

    return (
      <AccountDropdown
        session={session}
        organizations={organizations}
        products={products.map((p) => ({
          account_id: p.account_id,
          product_id: p.product_id,
          title: p.title,
        }))}
        pendingInvitations={pendingInvitations}
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
