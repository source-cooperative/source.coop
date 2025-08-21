import { notFound } from "next/navigation";
import { getServerSession } from "@ory/nextjs/app";
import { Container, Heading, Text } from "@radix-ui/themes";
import { accountsTable } from "@/lib/clients/database";
import { getOryId } from "@/lib/ory";
import { EditProfileForm } from "./EditProfileForm";

type Params = Promise<{ account_id: string }>;

export default async function EditProfilePage({ params }: { params: Params }) {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  const session = await getServerSession();

  if (!account) {
    notFound();
  }

  // Can only edit your own profile
  if (session && account.identity_id !== getOryId(session)) {
    return (
      <Container size="2" py="6">
        <Heading size="6" mb="4">
          Access Denied
        </Heading>

        <Text as="p" size="3" color="gray" className="mb-4">
          You do not have permission to edit this profile.
        </Text>
      </Container>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <EditProfileForm account={account} />
    </div>
  );
}
