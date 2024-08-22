import { Box, useColorMode } from "theme-ui";
import Button from "./Button";
import { useEffect, useState } from "react";
import SVG from "./SVG";
import ory from "@/pkg/sdk";
import { useRouter } from "next/router";

import { useUser } from "@/lib/api";

function DownArrow({ ...props }) {
  return (
    <>
      <SVG
        viewBox="0 0 16 16"
        sx={{
          ml: 0,
          width: ["8px", "8px", "12px", "12px"],
          height: ["8px", "8px", "12px", "12px"],
          fill: "background",
          transform: [
            "translate(0, 0px)",
            "translate(0, 0px)",
            "translate(0, 1px)",
            "translate(0, 1px)",
          ],
        }}
      >
        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
      </SVG>
    </>
  );
}

function DropDown({ expanded, ...props }) {
  return (
    <Box
      sx={{
        display: expanded ? "block" : "none",
        backgroundColor: "primary",
        p: 2,
        minWidth: "max-content",
        position: "absolute",
        ...props,
      }}
    >
      <Button href="#" sx={{ display: "block" }} variant="nav">
        Repositories
      </Button>
      <Button href="#" sx={{ display: "block" }} variant="nav">
        Organizations
      </Button>
      <Button href="#" sx={{ display: "block" }} variant="nav">
        Sign Out
      </Button>
    </Box>
  );
}

export default function UserNavButton() {
  const { user, isLoading, isError } = useUser();

  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [colorMode, setColorMode] = useColorMode();

  if (!user || isError) {
    return (
      <Box sx={{ justifySelf: "center", display: "inline-block" }}>
        <Button
          variant="nav"
          href={
            "/auth/login?return_to=" +
            process.env.NEXT_PUBLIC_BASE_URL +
            router.asPath
          }
        >
          Sign In / Register
        </Button>
      </Box>
    );
  } else if (!user.account) {
    return (
      <Box sx={{ justifySelf: "center", display: "inline-block" }}>
        <Button variant="nav" href="/auth/username">
          Claim Username
        </Button>
      </Box>
    );
  } else {
    return (
      <Box
        sx={{ justifySelf: "center", display: "inline-block" }}
        onMouseOut={(e) => setExpanded(false)}
        onMouseOver={(e) => setExpanded(true)}
      >
        <Button
          variant="nav"
          onClick={(e) => {
            setExpanded(!expanded);
          }}
        >
          {user.profile.name.first_name} {user.profile.name.last_name}{" "}
          <DownArrow />
        </Button>
        <Box sx={{ position: "relative" }}>
          <Box
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              opacity: expanded ? 1 : 0,
              pointerEvents: expanded ? "all" : "none",
              backgroundColor: "primary",
              textAlign: "right",
              width: "max-content",
            }}
          >
            <Button variant="nav" href={"/" + user.account.account_id}>
              @{user.account.account_id}
            </Button>
            {user.flags.includes("create_repository") ? (
              <Button variant="nav" href="/repositories/new">
                New Repository
              </Button>
            ) : (
              <></>
            )}
            <Button variant="nav" href={"/account/profile"}>
              Settings
            </Button>
            <Button
              variant="nav"
              href={"/auth/logout?return_to=" + router.asPath}
            >
              Sign Out
            </Button>
            <Button
              variant="nav"
              sx={{ display: ["initial", "initial", "none", "none"] }}
              onClick={(e) => {
                setColorMode(colorMode === "light" ? "dark" : "light");
              }}
            >
              {colorMode == "light" ? "Dark Mode" : "Light Mode"}
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }
}
