import { Box, Flex, Text } from "@radix-ui/themes";

/**
 * Fields that exist because of a choice made above them.
 *
 * A provider or an authentication method swaps out what follows it. Without a
 * rule tying those fields to the control that produced them, they read as part
 * of the same flat list — and nothing suggests that choosing differently would
 * replace them.
 */
export function ConditionalGroup({
  because,
  children,
}: {
  /**
   * The choice these fields depend on, phrased to follow "Because" —
   * `"provider is AWS S3"`, not `"AWS S3"`.
   */
  because: string;
  children: React.ReactNode;
}) {
  return (
    <Box pl="4" style={{ borderLeft: "2px solid var(--gray-5)" }}>
      <Flex direction="column" gap="4">
        <Text
          size="1"
          color="gray"
          style={{
            fontFamily: "var(--code-font-family)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Because {because}
        </Text>
        {children}
      </Flex>
    </Box>
  );
}
