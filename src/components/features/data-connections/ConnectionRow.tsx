import { Box, Flex, Text } from "@radix-ui/themes";
import { Link1Icon } from "@radix-ui/react-icons";

/**
 * One data connection in a list.
 *
 * There are two lists of the same thing — an account's connections and the ones
 * backing a product — and they had drifted into a table and a set of cards.
 * Same entity, same shape: title and markers on the left, a mono line of
 * identifiers under it, actions on the right, and an optional footer for
 * anything editable.
 */
export function ConnectionRow({
  title,
  markers,
  meta,
  actions,
  footer,
}: {
  title: React.ReactNode;
  /** Short state labels beside the title — "Primary", "Read only". */
  markers?: React.ReactNode;
  /** Identifiers, in the code face: ids, providers, buckets, regions. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** Tinted strip beneath, for a value that can be edited in place. */
  footer?: React.ReactNode;
}) {
  return (
    <Box
      style={{
        border: "1px solid var(--gray-6)",
        backgroundColor: "var(--color-panel-solid)",
      }}
    >
      <Flex justify="between" align="start" gap="3" p="4">
        <Box minWidth="0">
          <Flex align="center" gap="2" wrap="wrap">
            {title}
            {markers}
          </Flex>
          {meta && (
            <Text
              size="1"
              color="gray"
              mt="1"
              style={{
                fontFamily: "var(--code-font-family)",
                display: "block",
                wordBreak: "break-all",
              }}
            >
              {meta}
            </Text>
          )}
        </Box>
        {actions && <Box flexShrink="0">{actions}</Box>}
      </Flex>
      {footer && (
        <Box
          p="4"
          style={{
            borderTop: "1px solid var(--gray-5)",
            backgroundColor: "var(--gray-2)",
          }}
        >
          {footer}
        </Box>
      )}
    </Box>
  );
}

/**
 * A state label beside a connection's name.
 *
 * Outlined rather than filled, and never coloured: these mark deliberate
 * configuration — read-only, primary — not conditions to react to. Colour stays
 * available for things that are actually wrong.
 */
export function ConnectionMarker({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="1"
      color="gray"
      style={{
        border: "1px solid var(--gray-7)",
        padding: "0 6px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Text>
  );
}

/** Shared empty state, so the two lists cannot drift apart again. */
export function ConnectionsEmpty({ children }: { children: React.ReactNode }) {
  return (
    <Flex
      direction="column"
      align="center"
      gap="2"
      py="8"
      style={{ userSelect: "none" }}
    >
      <Link1Icon width="48" height="48" color="var(--gray-8)" />
      <Text size="4" weight="medium" color="gray">
        No data connections
      </Text>
      <Text size="2" color="gray">
        {children}
      </Text>
    </Flex>
  );
}
