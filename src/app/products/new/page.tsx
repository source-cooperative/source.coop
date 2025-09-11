import { ProductCreationForm } from "@/components/features/products/ProductCreationForm";
import { accountsTable, getPageSession, membershipsTable } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, MembershipState } from "@/types";
import { NotFoundPage, NotAuthorizedPage, FormTitle } from "@/components/core";

export default async function NewProductPage() {
  const session = await getPageSession();
  if (!session?.account) {
    return (
      <NotFoundPage
        title="Login Required"
        description="You must be logged in to create a product."
        actionText="Go to Login"
        actionHref="/auth/login"
      />
    );
  }

  // Check if user has permission to create products
  if (!isAuthorized(session, "*", Actions.CreateRepository)) {
    return (
      <NotAuthorizedPage
        description={
          <>
            You do not have permission to create products.
            <br />
            <br />
            If you believe this is an error, please contact{" "}
            <code>hello@source.coop</code>.
          </>
        }
      />
    );
  }

  const memberships = await membershipsTable.listByUser(
    session.account.account_id
  );
  const potentialOwnerAccounts = [
    session.account,
    ...(await accountsTable.fetchManyByIds(
      memberships
        .filter((membership) => membership.state === MembershipState.Member)
        .map((membership) => membership.membership_account_id)
    )),
  ];

  return (
    <>
      <FormTitle
        title="Create New Product"
        description="Create a new product to share with others"
      />

      <ProductCreationForm potentialOwnerAccounts={potentialOwnerAccounts} />
    </>
  );
}
