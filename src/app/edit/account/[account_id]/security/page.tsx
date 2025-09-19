import { FormTitle } from "@/components";
import { Box, Text } from "@radix-ui/themes";

interface SecurityPageProps {
  params: Promise<{ account_id: string }>;
}

export default async function SecurityPage({ params }: SecurityPageProps) {
  return (
    <Box>
      <FormTitle
        title="Security"
        description="Manage your account security settings"
      />
      <Box
        style={{
          padding: "24px",
          border: "1px solid var(--gray-6)",
          borderRadius: "8px",
          backgroundColor: "var(--gray-2)",
        }}
      >
        <Text size="3" color="gray">
          Security settings will be implemented here
        </Text>
      </Box>
    </Box>
  );
}
