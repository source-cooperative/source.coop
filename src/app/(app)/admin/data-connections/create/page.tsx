import { Flex, Heading } from "@radix-ui/themes";
import { DataConnectionForm } from "@/components/features/data-connections";

export default function CreateDataConnectionPage() {
  return (
    <Flex direction="column" gap="4">
      <Heading size="4">Create Data Connection</Heading>
      <DataConnectionForm mode="create" />
    </Flex>
  );
}
