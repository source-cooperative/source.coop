import { Box, Flex, Text } from "@radix-ui/themes";
import { SectionHeader } from "./SectionHeader";

interface DangerZoneProps {
  title: string;
  description: React.ReactNode;
  /** The destructive control itself. */
  action: React.ReactNode;
  /**
   * Why the action cannot be taken, under the description. Belongs on the left
   * with the explanation rather than beside the button: it is a reason, not a
   * control.
   */
  note?: React.ReactNode;
}

/**
 * Where irreversible actions live. Just another section of the page — same
 * heading and rule as every other — carried in red.
 */
export function DangerZone({
  title,
  description,
  action,
  note,
}: DangerZoneProps) {
  return (
    // No wrapper margin: SectionHeader already spaces itself off the section
    // above, and this is another section, not a special case.
    <SectionHeader title="Danger zone" color="red">
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
          {note && <Box mt="2">{note}</Box>}
        </Box>
        <Box flexShrink="0">{action}</Box>
      </Flex>
    </SectionHeader>
  );
}
