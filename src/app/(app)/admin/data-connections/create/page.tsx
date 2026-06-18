import { Metadata } from "next";
import { Flex, Heading } from "@radix-ui/themes";
import { DataConnectionForm } from "@/components/features/data-connections";

export const metadata: Metadata = {
  title: "Admin — Create data connection",
};

export default function CreateDataConnectionPage() {
  return (
    <Flex direction="column" gap="4">
      <Heading size="4">Create Data Connection</Heading>
      <DataConnectionForm mode="create" />
    </Flex>
  );
}
