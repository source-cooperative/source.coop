import { Box, Flex, Text } from "@radix-ui/themes";
import { Link1Icon } from "@radix-ui/react-icons";

/**
 * The container both connection lists sit in: one bordered box with hairline
 * separators, rather than a card per connection.
 *
 * A card each looked fine with three rows and fell apart at thirty — an account
 * can hold every regional Open Data connection, and a page of separately
 * bordered boxes is mostly gaps.
 */
export function ConnectionList({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        border: "1px solid var(--gray-6)",
        backgroundColor: "var(--color-panel-solid)",
      }}
    >
      {children}
    </Box>
  );
}

/**
 * One data connection in a list.
 *
 * Two lists render the same entity — an account's connections, and the ones
 * backing a product — so they share a row: name and state on the first line,
 * identifiers in the code face beneath, actions right, and an optional footer
 * for anything editable in place.
 */
export function ConnectionRow({
  title,
  markers,
  meta,
  aside,
  actions,
  footer,
}: {
  title: React.ReactNode;
  /** State worth reacting to, beside the name. Keep it to one thing. */
  markers?: React.ReactNode;
  /** Identifiers, in the code face: ids, providers, buckets, regions. */
  meta?: React.ReactNode;
  /** Secondary detail, right-aligned and quiet — never a control. */
  aside?: React.ReactNode;
  actions?: React.ReactNode;
  /** Tinted strip beneath, for a value that can be edited in place. */
  footer?: React.ReactNode;
}) {
  return (
    <Box
      style={{
        borderTop: "1px solid var(--gray-5)",
        // Collapses the first row's border into the container's own.
        marginTop: "-1px",
      }}
    >
      <Flex align="start" gap="3" px="4" py="3">
        {/* The aside wraps below the name when the two no longer fit side by
            side; actions stay on the name's line, since a control that moves
            around is harder to hit than a label that does. */}
        <Flex
          justify="between"
          align="center"
          gap="3"
          wrap="wrap"
          flexGrow="1"
          minWidth="0"
        >
          {/* A floor on the name column, so a narrow screen wraps the aside
              rather than squeezing the name to a word per line. `min()` keeps
              the floor from overflowing a container narrower than it is. */}
          <Box flexGrow="1" style={{ minWidth: "min(13rem, 100%)" }}>
            <Flex align="center" gap="2" wrap="wrap">
              {title}
              {markers}
            </Flex>
            {meta && (
              <Text
                size="1"
                color="gray"
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
          {aside && <Box ml="auto">{aside}</Box>}
        </Flex>
        {actions && (
          // Pinned to the name's line rather than the row's centre, so a row
          // that has wrapped does not leave its control floating mid-height.
          <Flex align="center" flexShrink="0" style={{ minHeight: "1.5rem" }}>
            {actions}
          </Flex>
        )}
      </Flex>
      {footer && (
        <Box
          px="4"
          py="3"
          style={{
            borderTop: "1px solid var(--gray-4)",
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
 * Outlined and uncoloured: this marks deliberate configuration — read-only,
 * primary — not a condition to react to. Colour stays free for what is wrong.
 *
 * Deliberately the only chip on a row. Everything else that could have been one
 * (ownership, permitted visibilities) is quiet text instead: four identical
 * outlined boxes per row read as a wall, and nothing inside a wall stands out.
 */
export function ConnectionMarker({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="1"
      color="gray"
      style={{
        border: "1px solid var(--gray-7)",
        padding: "0 5px",
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
