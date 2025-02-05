/** @jsxImportSource theme-ui */

import { Container, Text, Grid, Box } from "theme-ui";
import SourceLink from "@/components/SourceLink";

const footerLinks = [
  { url: "/", display: "Home", external: false },
  { url: "/repositories", display: "All Repositories", external: false },
  { url: "https://docs.source.coop", display: "Docs", external: true },
];

export function Footer({}) {
  return (
    <Box as="footer" sx={{ bg: "background", py: 4 }}>
      <Box
        as="hr"
        sx={{
          border: "none",
          borderBottom: "1px solid",
          borderColor: "muted",
          mb: 4,
          width: "100%",
        }}
      />
      <Container
    </Box>
  );
}