/** @jsxImportSource theme-ui */

import { Text, Grid } from "theme-ui";
import SourceLink from "@/components/SourceLink";

const footerLinks = [
  { url: "/", display: "Home", external: false },
  { url: "/repositories", display: "Repositories", external: false },
  { url: "https://docs.source.coop", display: "Docs", external: true },
  { url: "mailto:hello@source.coop", display: "Contact", external: false },
  {
    url: "https://join.slack.com/t/sourcecoop/shared_invite/zt-212sakf1j-fONCD4lZ_v2HP2PDpTr2dw",
    display: "Slack",
    external: true,
  },
  {
    url: "https://forms.gle/fjMpYrwpVZEaBExW6",
    display: "Publish Data",
    external: true,
  },
  { url: "https://radiant.earth", display: "Radiant Earth", external: true },
];

export function Footer({}) {
  return (
    <Grid
      sx={{
        backgroundColor: "footerBackground",
        gridTemplateColumns: [
          "auto auto",
          "auto auto auto",
          "auto auto auto",
          "auto auto auto auto",
        ],
        rowGap: 1,
        mt: 2,
        py: 3,
        px: [2, 2, 3, 4],
      }}
    >
      {footerLinks.map(({ url, display, external }, i) => {
        if (url) {
          return (
            <SourceLink
              key={"footer-link-" + i}
              href={url}
              variant="footer"
              sx={{ textAlign: "center" }}
            >
              <Text>{display}</Text>
            </SourceLink>
          );
        }
        return <Text variant="footer">{display}</Text>;
      })}
    </Grid>
  );
}
