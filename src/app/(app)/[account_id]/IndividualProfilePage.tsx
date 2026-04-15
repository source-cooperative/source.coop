import {
  accountsTable,
  isOrganizationalAccount,
  membershipsTable,
  productsTable,
} from "@/lib/clients/database";
import { type IndividualAccount, Actions } from "@/types";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { IndividualProfile } from "@/components/features/profiles/IndividualProfile";

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

  // Filter products based on authentication status
  products = products.filter((product) =>
    isAuthorized(session, product, Actions.GetRepository)
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
  ).filter(isOrganizationalAccount);

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
    />
  );
}
