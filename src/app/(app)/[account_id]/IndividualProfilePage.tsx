import {
  accountsTable,
  hidePendingTags,
  isOrganizationalAccount,
  membershipsTable,
  productsTable,
} from "@/lib/clients/database";
import { type IndividualAccount, Actions } from "@/types";
import { getPageSession } from "@/lib/api/utils";
import {
  canCreateProductForAccount,
  canListOnProfile,
  isAuthorized,
} from "@/lib/api/authz";
import { IndividualProfile } from "@/components/features/profiles/IndividualProfile";
import { publicView } from "@/types";

interface IndividualProfilePageProps {
  account: IndividualAccount;
  showWelcome: boolean;
}

export async function IndividualProfilePage({
  account,
  showWelcome,
}: IndividualProfilePageProps) {
  const session = await getPageSession();

  let { products } = await productsTable.listByAccount(
    account.account_id,
    1000
  );

  // Authorized with the account attached, so a disabled one disables its
  // products; the listing itself stays without it, as the profile it sits on
  // already says who provides them.
  const owner = publicView(account);
  products = await hidePendingTags(
    products.filter((product) =>
      canListOnProfile(session, { ...product, account: owner })
    )
  );

  const memberships = (
    await membershipsTable.listByUser(account.account_id)
  ).filter((membership) =>
    isAuthorized(account, membership, Actions.GetMembership)
  );
  const organizations = (
    await accountsTable.fetchManyByIds(
      memberships.map((membership) => membership.membership_account_id)
    )
  )
    .filter(isOrganizationalAccount)
    .map(publicView);

  // For individual accounts
  return (
    <IndividualProfile
      account={account as IndividualAccount}
      isOwner={session?.account?.account_id === account.account_id}
      ownedProducts={products}
      contributedProducts={[]}
      organizations={organizations}
      showWelcome={showWelcome}
      canEdit={isAuthorized(session, account, Actions.PutAccountProfile)}
      canCreateProduct={canCreateProductForAccount(session, account)}
    />
  );
}
