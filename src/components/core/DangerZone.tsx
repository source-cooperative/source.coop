import { Box, Flex, Text } from "@radix-ui/themes";
import { SectionHeader } from "./SectionHeader";

/**
 * Where irreversible actions live. Just another section of the page — same
 * heading and rule as every other — carried in red. Holds one
 * {@link DangerZoneItem} per action.
 */
export function DangerZone({ children }: { children: React.ReactNode }) {
  return (
    // Its own top margin, now that SectionHeader carries none: this sits at the
    // end of a page rather than inside a form's wrapper, so nothing else is
    // separating it from what comes before.
    <Box mt="6">
      <SectionHeader title="Danger zone" color="red">
        <Flex
          direction="column"
          style={{
            border: "1px solid var(--red-6)",
            backgroundColor: "var(--red-2)",
          }}
        >
          {children}
        </Flex>
      </SectionHeader>
    </Box>
  );
}

interface DangerZoneItemProps {
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

/** One irreversible action: what it does on the left, its control on the right. */
export function DangerZoneItem({
  title,
  description,
  action,
  note,
}: DangerZoneItemProps) {
  return (
    <Flex
      align="start"
      justify="between"
      gap="5"
      p="4"
      // Rules between items, not around them: the zone draws the outer border.
      style={{ borderTop: "1px solid var(--red-6)", marginTop: -1 }}
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
  );
}
