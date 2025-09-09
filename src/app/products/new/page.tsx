import { ProductCreationForm } from "@/components/features/products/ProductCreationForm";
import { accountsTable, getPageSession, membershipsTable } from "@/lib";
import { MembershipState } from "@/types";
import { Heading, Section, Text } from "@radix-ui/themes";

interface PageProps {}

export default async function NewProductPage({}: PageProps) {
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
    <Section size="1">
      <ProductCreationForm potentialOwnerAccounts={potentialOwnerAccounts} />
    </Section>
  );
}
