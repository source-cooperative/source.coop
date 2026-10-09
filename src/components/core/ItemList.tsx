import Link from "next/link";
import { Box, Flex, Text } from "@radix-ui/themes";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import styles from "./ItemList.module.css";

/**
 * The container rows sit in: one bordered box with hairline separators, rather
 * than a card per item. A card each looks fine at three rows and falls apart at
 * thirty, where a page of separately bordered boxes is mostly gaps.
 */
function Root({ children }: { children: React.ReactNode }) {
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
 * One item in an `ItemList.Root`: name and state on the first line,
 * identifiers in the code face beneath, actions right, and an optional footer
 * for anything editable in place. Every list of settings-like objects uses it,
 * so they cannot drift apart.
 *
 * With an `href` the whole row opens that page: the title becomes the link,
 * stretched over the row, and a chevron stands in for actions.
 */
function Row({
  href,
  title,
  markers,
  meta,
  aside,
  actions,
  footer,
}: {
  /** The page the row opens. Rows that act in place leave it unset. */
  href?: string;
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
      <Flex
        align="center"
        gap="3"
        px="4"
        py="3"
        className={href ? styles.linked : undefined}
      >
        {/* The aside wraps below the name when the two no longer fit side by
            side. */}
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
              {href ? (
                <Link href={href} className={styles.title}>
                  {title}
                </Link>
              ) : (
                title
              )}
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
        {href ? (
          <span className={styles.chevron} aria-hidden>
            <ChevronRightIcon />
          </span>
        ) : (
          actions && (
            <Flex align="center" flexShrink="0">
              {actions}
            </Flex>
          )
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
 * A state label beside a row's name.
 *
 * Outlined and uncoloured: this marks deliberate configuration — read-only,
 * primary — not a condition to react to. Colour stays free for what is wrong.
 *
 * Deliberately the only chip on a row. Everything else that could have been one
 * (ownership, permitted visibilities) is quiet text instead: four identical
 * outlined boxes per row read as a wall, and nothing inside a wall stands out.
 */
function Marker({ children }: { children: React.ReactNode }) {
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

/**
 * A bordered list of settings-like objects — data connections, service
 * accounts, API keys — as `ItemList.Root` holding `ItemList.Row`s, each with
 * at most one `ItemList.Marker`.
 */
export const ItemList = { Root, Row, Marker };
