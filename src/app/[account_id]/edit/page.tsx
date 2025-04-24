import { notFound } from "next/navigation";
import { getServerSession } from "@ory/nextjs/app";
import { Container, Heading, Text } from "@radix-ui/themes";
import { fetchAccount } from "@/lib/db";
import { getAccountId } from "@/lib/ory";
import { EditProfileForm } from "./EditProfileForm";

type Params = Promise<{ account_id: string }>;

export default async function EditProfilePage({ params }: { params: Params }) {
  const { account_id } = await params;
  const account = await fetchAccount(account_id);
  const session = await getServerSession();

  if (!account) {
    notFound();
  }

  const userAccount = getAccountId(session);
  if (userAccount !== account_id) {
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
