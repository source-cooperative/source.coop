import { Box, Flex, Text } from "@radix-ui/themes";

interface DangerZoneProps {
  title: string;
  description: React.ReactNode;
  /** The destructive control itself. */
  action: React.ReactNode;
}

/**
 * Where irreversible actions live. Bordered and tinted so a delete control is
 * never mistaken for the rest of the form.
 */
export function DangerZone({ title, description, action }: DangerZoneProps) {
  return (
    <Box mt="6">
      <Text as="p" size="2" weight="bold" color="red" mb="2">
        Danger zone
      </Text>
      <Flex
        align="start"
        justify="between"
        gap="5"
        p="4"
        style={{
          border: "1px solid var(--red-6)",
          backgroundColor: "var(--red-2)",
        }}
      >
        <Box>
          <Text as="p" size="2" weight="medium">
            {title}
          </Text>
          <Text as="p" size="1" color="gray" mt="1">
            {description}
          </Text>
        </Box>
        <Box flexShrink="0">{action}</Box>
      </Flex>
    </Box>
  );
}
