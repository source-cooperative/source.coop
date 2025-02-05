/** @jsxImportSource theme-ui */

import { Container, Text, Grid, Box } from "theme-ui";
import type { ThemeUIStyleObject } from "theme-ui";
import SourceLink from "@/components/SourceLink";

// Move this to a separate constants file if used elsewhere
const footerLinks = [
  { url: "/", display: "Home", external: false },
  { url: "/repositories", display: "All Repositories", external: false },
  { url: "https://docs.source.coop", display: "Docs", external: true },
] as const; // Add type safety

// Extract reusable styles
const styles: Record<string, ThemeUIStyleObject> = {
  hr: {
    border: "none",
    borderBottom: "1px solid",
    borderColor: "muted",
    my: 3,
    width: "100%",
  },
  container: {
    width: ["100%", "100%", "100%", "70%"] as const,
    margin: "0 auto",
    px: 3,
  },
  grid: {
    gridTemplateColumns: ["auto"],
    rowGap: 1,
    justifyContent: "flex-start",
    textAlign: "left",
  },
} as const;

export function Footer() {
  return (
    <Box as="footer" sx={{ bg: "background", py: 4 }}>
      <Box as="hr" sx={styles.hr} />
      <Container sx={styles.container}>
        <Grid sx={styles.grid}>
          {footerLinks.map(({ url, display }, i) => 
            url ? (
              <SourceLink
                key={`footer-link-${i}`}
                href={url}
                variant="footer"
              >
                <Text>{display}</Text>
              </SourceLink>
            ) : (
              <Text key={`footer-text-${i}`} variant="footer" sx={{ textAlign: "left" }}>
                {display}
              </Text>
            )
          )}
          <Text variant="footer">
            <Box as="hr" sx={styles.hr} />
            Source Cooperative is a{" "}
            <SourceLink href="https://radiant.earth" variant="footer">
              Radiant Earth
            </SourceLink>
            {" "}initiative.
          </Text>
        </Grid>
      </Container>
    </Box>
  );
}