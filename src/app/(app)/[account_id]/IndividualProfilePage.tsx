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
import { getAccountAnalytics, type Period } from "@/lib/clients/analytics";

interface IndividualProfilePageProps {
  account: IndividualAccount;
  showWelcome: boolean;
  period?: Period;
}

export async function IndividualProfilePage({
  account,
  showWelcome,
  period = 7,
}: IndividualProfilePageProps) {
  const session = await getPageSession();

  let [{ products }, membershipsRaw, analyticsData] = await Promise.all([
    productsTable.listByAccount(account.account_id, 1000),
    membershipsTable.listByUser(account.account_id),
    getAccountAnalytics(account.account_id, period),
  ]);

  // Filter products based on authentication status
  products = products.filter((product) =>
    isAuthorized(session, product, Actions.GetRepository)
  );

  const memberships = membershipsRaw.filter((membership) =>
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
      analyticsData={analyticsData}
      analyticsPeriod={period}
    />
  );
}
