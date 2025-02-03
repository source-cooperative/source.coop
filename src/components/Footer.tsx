/** @jsxImportSource theme-ui */

import { Container, Text, Grid, Box } from "theme-ui";
import SourceLink from "@/components/SourceLink";

const footerLinks = [
  { url: "/", display: "Home", external: false },
  { url: "/repositories", display: "Repositories", external: false },
  { url: "https://docs.source.coop", display: "Docs", external: true },
];

export function Footer({}) {
  return (
    <Container
        sx={{
          width: ["100%", "100%", "100%", "70%"],
          margin: "0 auto",
          px: 3,
        }}
      >
        <Grid
          sx={{
            gridTemplateColumns: ["auto"],
            rowGap: 1,
            justifyContent: "flex-start",
            textAlign: "left",
          }}
        >
          {footerLinks.map(({ url, display }, i) => (
            url ? (
              <SourceLink
                key={"footer-link-" + i}
                href={url}
                variant="footer"
              >
                <Text>{display}</Text>
              </SourceLink>
            ) : (
              <Text key={"footer-text-" + i} variant="footer" sx={{ textAlign: "left" }}>
                {display}
              </Text>
            )
          ))}
          <Text variant="footer">
            <Box
                as="hr"
                sx={{
                  border: "none",      // Removes default styles
                  borderBottom: "1px solid",
                  borderColor: "muted", // Uses the Theme UI muted color (adjust as needed)
                  my: 3,               // Adds spacing above and below the line
                  width: "100%",       // Makes sure it spans the full width
                }}
              />
              Source Cooperative is a{" "}
              <SourceLink href="https://radiant.earth" variant="footer">
                Radiant Earth
              </SourceLink>
              {" "}initiative.
          </Text>
        </Grid>
      </Container>
  );
}
