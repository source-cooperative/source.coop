import { ProductCreationForm } from "@/components/features/products/ProductCreationForm";
import { accountsTable, getPageSession, membershipsTable } from "@/lib";
import { canCreateProductForAccount, isAuthorized } from "@/lib/api/authz";
import { listUsableDataConnections } from "@/lib/data-connections";
import { Actions, DataConnectionObjectSchema, MembershipState } from "@/types";
import { Heading, Text } from "@radix-ui/themes";
import { FormTitle } from "@/components/core";
import { getTranslations } from "next-intl/server";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const { owner } = await searchParams;
  const session = await getPageSession();
  const t = await getTranslations("NewProductPage");
  if (!session?.account) {
    return (
      <>
        <Heading size="6" mb="4">
          {t("accessDenied")}
        </Heading>

        <Text as="p" size="3" color="gray" className="mb-4">
          {t("mustLogIn")}
        </Text>
      </>
    );
  }

  // Check if user has permission to create products
  if (!isAuthorized(session, "*", Actions.CreateRepository)) {
    return (
      <Text>
        {t("noPermission")}
        <br />
        {t.rich("contactUs", {
          email: "hello@source.coop",
          code: (chunks) => <code>{chunks}</code>,
        })}
      </Text>
    );
  }

  const memberships = await membershipsTable.listByUser(
    session.account.account_id
  );
  const candidateOwnerAccounts = [
    session.account,
    ...(await accountsTable.fetchManyByIds(
      memberships
        .filter((membership) => membership.state === MembershipState.Member)
        .map((membership) => membership.membership_account_id)
    )),
  ];
  // Only accounts the user can actually create a product under (self with the
  // flag, or an org they own/maintain) — a read/write-data membership doesn't
  // qualify, even though it makes the account "potential" above.
  const potentialOwnerAccounts = candidateOwnerAccounts.filter((account) =>
    canCreateProductForAccount(session, account)
  );

  // Strip credentials before handing connections to the client component.
  const dataConnections = (await listUsableDataConnections(session)).map(
    (connection) =>
      DataConnectionObjectSchema.omit({ authentication: true }).parse(
        connection
      )
  );

  return (
    <>
      <FormTitle
        title={t("title")}
        description={t("description")}
      />

      <ProductCreationForm
        potentialOwnerAccounts={potentialOwnerAccounts}
        dataConnections={dataConnections}
        defaultOwnerId={
          // Preselect the owner from ?owner=… (e.g. "New product" opened from an
          // org's menu), but only if the user can actually own products there.
          potentialOwnerAccounts.some((a) => a.account_id === owner)
            ? owner
            : undefined
        }
      />
    </>
  );
}
