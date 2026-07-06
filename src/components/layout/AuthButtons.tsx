import { AccountDropdown } from "./AccountDropdown";
import { MobileMenu, LoggedOutMobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import {
  accountsTable,
  isOrganizationalAccount,
  productsTable,
} from "@/lib/clients/database";
import { Box, Callout, Flex, Link } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Account, Actions, MembershipState } from "@/types";
import { onboardingUrl } from "@/lib/urls";
import { LoginButton } from "@/components/core";
import { invitationLink } from "./accountMenu";

export async function AuthButtons() {
  const session = await getPageSession();

  if (session?.account) {
    const self = session.account;
    const memberships = session.memberships ?? [];
    // Accepted org memberships (distinct) vs outstanding invites: an invite
    // must not read as an org you belong to — it goes in "Invitations" instead.
    const memberOrgIds = [
      ...new Set(
        memberships
          // Org-level memberships only — a product-level membership doesn't make
          // you an org member (matches OrganizationProfilePage's isMember).
          .filter(
            (m) =>
              m.state === MembershipState.Member &&
              m.repository_id === undefined
          )
          .map((m) => m.membership_account_id)
      ),
    ];
    const invited = memberships.filter(
      (m) => m.state === MembershipState.Invited
    );

    // One round trip: org accounts (member + invited, for names), the products
    // owned by you and by each org you belong to, and titles for product invites.
    const productAccountIds = [self.account_id, ...memberOrgIds];
    const [orgAccounts, productLists, invitedProducts] = await Promise.all([
      accountsTable.fetchManyByIds([
        ...memberOrgIds,
        ...invited.map((m) => m.membership_account_id),
      ]),
      Promise.all(
        productAccountIds.map((id) =>
          // Over-fetch, then filter by authz, then cap in toProducts — capping
          // at the query would drop authorized products behind restricted ones.
          // ponytail: 100-deep window; paginate if accounts commonly exceed it.
          productsTable.listByAccount(id, 100).then((r) => r.products)
        )
      ),
      Promise.all(
        invited
          .filter((m) => m.repository_id)
          .map((m) =>
            productsTable.fetchById(m.membership_account_id, m.repository_id!)
          )
      ),
    ]);

    const accountsById = new Map(orgAccounts.map((a) => [a.account_id, a]));
    const productsByAccount = new Map(
      productAccountIds.map((id, i) => [id, productLists[i]])
    );
    // Only surface products the user is authorized to see, so an org member
    // isn't shown the org's restricted products they can't access (matches
    // IndividualProfilePage's GetRepository filter).
    const toProducts = (id: string) =>
      (productsByAccount.get(id) ?? [])
        .filter((p) => isAuthorized(session, p, Actions.GetRepository))
        .slice(0, 20)
        .map((p) => ({ product_id: p.product_id, title: p.title }));

    // Accounts you can browse: yourself first, then each org you belong to.
    const accounts = [
      { account: self, isSelf: true, products: toProducts(self.account_id) },
      ...memberOrgIds
        .map((id) => accountsById.get(id))
        .filter((a): a is Account => !!a && isOrganizationalAccount(a))
        .map((a) => ({
          account: a,
          isSelf: false,
          products: toProducts(a.account_id),
        })),
    ];

    const productTitleByKey = new Map<string, string>();
    for (const p of invitedProducts) {
      if (p) productTitleByKey.set(`${p.account_id}/${p.product_id}`, p.title);
    }
    const pendingInvitations = invited.map((m) =>
      invitationLink(m, {
        organizationName: accountsById.get(m.membership_account_id)?.name,
        productTitle: m.repository_id
          ? productTitleByKey.get(`${m.membership_account_id}/${m.repository_id}`)
          : undefined,
      })
    );

    return (
      <>
        {/* Desktop: Products link (+ divider) + account dropdown */}
        <Flex display={{ initial: "none", sm: "flex" }} align="center" gap="4">
          <NavLinks divider />
          <AccountDropdown
            session={session}
            accounts={accounts}
            pendingInvitations={pendingInvitations}
          />
        </Flex>
        {/* Mobile: single hamburger → full-screen sheet */}
        <Box display={{ initial: "block", sm: "none" }}>
          <MobileMenu
            session={session}
            accounts={accounts}
            pendingInvitations={pendingInvitations}
          />
        </Box>
      </>
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

  return (
    <>
      {/* Desktop: nav links + login inline */}
      <Flex display={{ initial: "none", sm: "flex" }} align="center" gap="4">
        <NavLinks />
        <LoginButton />
      </Flex>
      {/* Mobile: hamburger → sheet with nav links + login */}
      <Box display={{ initial: "block", sm: "none" }}>
        <LoggedOutMobileMenu />
      </Box>
    </>
  );
}
