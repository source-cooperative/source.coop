import { Box, Grid, Select } from "theme-ui";
import SourceLink from "./SourceLink";
import Skeleton from "react-loading-skeleton";
import { useRouter } from "next/router";
import { SideNavLink } from "@/lib/types";
import { NextRouter } from "next/router";

function onSelectChange(
  e: React.ChangeEvent<HTMLSelectElement>,
  links: SideNavLink[],
  router: NextRouter
) {
  links.forEach((link, i) => {
    if (e.target.value === i.toString()) {
      router.push(link.href);
    }
  });
}

export default function SideNav({ links }: { links: SideNavLink[] }) {
  const router = useRouter();
  if (!links) {
    return <></>;
  }

  var defaultLink = null;
  links.forEach((link, i) => {
    if (link && link.active) {
      defaultLink = i.toString();
    }
  });

  return (
    <Box
      sx={{
        position: [null, null, "sticky", "sticky"],
        textAlign: ["left", "left", "left", "left"],
        top: [null, null, "75px", "75px"],
        pt: [2, 2, 5, 5],
        mb: 3,
        width: "100%",
      }}
    >
      <Grid
        sx={{
          display: ["none", "none", "grid", "grid"],
          gridTemplateColumns: [null, null, "1fr", "1fr"],
        }}
      >
        <Grid
          sx={{
            gridGap: 0,
            mr: 2,
            pr: 3,
            py: 1,
            fontFamily: "mono",
            borderColor: "codeBorder",
            fontSize: 3,
            gridTemplateColumns: "1fr",
            justifyItems: "right",
            textAlign: "right",
          }}
        >
          {links.map((link, i) => {
            if (!link) {
              return (
                <Box key={"side-nav-" + i} sx={{ width: "100%" }}>
                  <Skeleton />
                </Box>
              );
            }

            return (
              <SourceLink
                key={"side-nav-" + i}
                variant={link.active ? "navLinkActive" : "navLink"}
                href={link.href}
              >
                {link.title}
              </SourceLink>
            );
          })}
        </Grid>
      </Grid>

      <Box sx={{ display: ["initial", "initial", "none", "none"] }}>
        <Select
          value={defaultLink}
          onChange={(e) => {
            onSelectChange(e, links, router);
          }}
        >
          {links.map((link, i) => {
            if (!link) {
              return <option key={"side-nav-select-" + i}>Loading...</option>;
            }
            return (
              <option key={"side-nav-select-" + i} value={i.toString()}>
                {link.title}
              </option>
            );
          })}
        </Select>
      </Box>
    </Box>
  );
}
