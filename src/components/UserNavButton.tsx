import { Box, useColorMode } from "theme-ui";
import Button from "./Button";
import { useEffect, useState } from "react";
import SVG from "./SVG";
import { useRouter } from "next/router";
import useSWR from "swr";
import { ClientError } from "@/lib/client/accounts";
import {
  AccountFlags,
  APIKey,
  APIKeyRequest,
  MembershipState,
  UserSession,
} from "@/api/types";
import { edgeConfig } from "@ory/integrations/next";

import { Configuration, FrontendApi, Session, Identity } from "@ory/client";

const baseUrl: string = process.env.NEXT_PUBLIC_IS_PROD
  ? process.env.NEXT_PUBLIC_ORY_SDK_URL
  : "http://localhost:3000/api/.ory";

let ory: FrontendApi;
if (process.env.NEXT_PUBLIC_IS_PROD) {
  ory = new FrontendApi(
    new Configuration({
      basePath: baseUrl,
      accessToken: process.env.ORY_ACCESS_TOKEN,
      baseOptions: {
        withCredentials: true, // Important for CORS
        timeout: 30000, // 30 seconds
      },
    })
  );
} else {
  ory = new FrontendApi(new Configuration(edgeConfig));
}

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

function generateNewKey(account_id: string) {
  const keyRequest: APIKeyRequest = {
    name: `Automatically generated key used for browser-based authentication (${
      navigator.userAgent.includes("Chrome")
        ? "Chrome"
        : navigator.userAgent.includes("Firefox")
        ? "Firefox"
        : navigator.userAgent.includes("Safari")
        ? "Safari"
        : "Unknown"
    } on ${
      /Windows/.test(navigator.userAgent)
        ? "Windows"
        : /Mac/.test(navigator.userAgent)
        ? "macOS"
        : /Linux/.test(navigator.userAgent)
        ? "Linux"
        : /Android/.test(navigator.userAgent)
        ? "Android"
        : /iOS/.test(navigator.userAgent)
        ? "iOS"
        : "Unknown"
    })`,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Valid for 30 days
  };

  fetch(`/api/v1/accounts/${account_id}/api-keys`, {
    credentials: "include",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(keyRequest),
  }).then((res) => {
    if (res.ok) {
      res.json().then((data) => {
        localStorage.setItem(`sc-api-key-${account_id}`, JSON.stringify(data));
      });
    }
  });
}

export default function UserNavButton() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [colorMode, setColorMode] = useColorMode();
  const [logoutUrl, setLogoutUrl] = useState<string | null>(null);

  const {
    data: user,
    isLoading: _userIsLoading,
    error: _userError,
  } = useSWR<UserSession, ClientError>(
    { path: `/api/v1/whoami` },
    {
      refreshInterval: 0,
    }
  );

  useEffect(() => {
    if (!user) {
      return;
    }
    ory.createBrowserLogoutFlow().then(({ data }) => {
      setLogoutUrl(data.logout_url);
    });
  }, [router, user]);

  useEffect(() => {
    if (user && !user.account) {
      router.push("/complete-signup");
      return;
    }

    if (!user || !user?.account) {
      return;
    }

    var existingKey = localStorage.getItem(
      `sc-api-key-${user.account.account_id}`
    );
    if (existingKey) {
      const apiKey: APIKey = JSON.parse(existingKey);
      if (new Date(apiKey.expires) < new Date()) {
        localStorage.removeItem(`sc-api-key-${user.account.account_id}`);
        generateNewKey(user.account.account_id);
        return;
      }
    } else {
      generateNewKey(user.account.account_id);
    }
  }, [user]);

  if (!user) {
    return (
      <Box sx={{ justifySelf: "center", display: "inline-block" }}>
        <Button
          variant="nav"
          href={`${process.env.NEXT_PUBLIC_ORY_SDK_URL}/ui/login`}
        >
          Sign In / Register
        </Button>
      </Box>
    );
  } else if (user.account) {
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
          {user?.account?.profile?.name
            ? user?.account?.profile?.name
            : "Source User"}{" "}
          <DownArrow />
        </Button>
        <Box sx={{ position: "relative" }}>
          <Box
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              zIndex: 99999,
              opacity: expanded ? 1 : 0,
              pointerEvents: expanded ? "all" : "none",
              backgroundColor: "primary",
              textAlign: "right",
              width: "max-content",
            }}
          >
            <Button variant="nav" href={`/${user.account.account_id}`}>
              @{user.account.account_id}
            </Button>
            {user.memberships.map((membership, i) => {
              if (membership.state !== MembershipState.Member) {
                return <></>;
              }
              return (
                <Button
                  key={i}
                  variant="nav"
                  href={`/${membership.membership_account_id}`}
                >
                  {`@${membership.membership_account_id}`}
                </Button>
              );
            })}

            {user?.account?.flags.includes(
              AccountFlags.CREATE_ORGANIZATIONS
            ) && (
              <Button variant="nav" href="/create-organization">
                Create Organization
              </Button>
            )}
            <Button
              variant="nav"
              href={`${process.env.NEXT_PUBLIC_ORY_SDK_URL}/ui/settings`}
            >
              Account Security
            </Button>
            <Button variant="nav" href={logoutUrl}>
              Sign Out
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }
}
