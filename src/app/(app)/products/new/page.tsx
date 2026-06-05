import { ProductCreationForm } from "@/components/features/products/ProductCreationForm";
import { accountsTable, getPageSession, membershipsTable } from "@/lib";
import { dataConnectionsTable } from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, MembershipState } from "@/types";
import { ProductVisibility } from "@/types/product";
import { Heading, Text } from "@radix-ui/themes";
import { FormTitle } from "@/components/core";
import { PRIMARY_DATA_CONNECTION_ID } from "@/lib/actions/products";

export default async function NewProductPage() {
  const session = await getPageSession();
  if (!session?.account) {
    return (
      <>
        <Heading size="6" mb="4">
          Access Denied
        </Heading>

        <Text as="p" size="3" color="gray" className="mb-4">
          You must be logged in to create a product.
        </Text>
      </>
    );
  }

  // Check if user has permission to create products
  if (!isAuthorized(session, "*", Actions.CreateRepository)) {
    return (
      <Text>
        You do not have permission to create products.
        <br />
        If you believe this is an error, please contact{" "}
        <code>hello@source.coop</code>.
      </Text>
    );
  }

  const [memberships, primaryDataConnection] = await Promise.all([
    membershipsTable.listByUser(session.account.account_id),
    dataConnectionsTable.fetchById(PRIMARY_DATA_CONNECTION_ID),
  ]);

  const potentialOwnerAccounts = [
    session.account,
    ...(await accountsTable.fetchManyByIds(
      memberships
        .filter((membership) => membership.state === MembershipState.Member)
        .map((membership) => membership.membership_account_id)
    )),
  ];

  const allowedVisibilities =
    primaryDataConnection?.allowed_visibilities ?? Object.values(ProductVisibility);

  return (
    <>
      <FormTitle
        title="Create New Product"
        description="Create a new product to share with others"
      />

      <ProductCreationForm
        potentialOwnerAccounts={potentialOwnerAccounts}
        allowedVisibilities={allowedVisibilities}
      />
    </>
  );
}
