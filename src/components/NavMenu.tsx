import { Box, Text, Grid, Image } from "theme-ui";
import { useEffect, useState } from "react";
import ory from "@/pkg/sdk";
import SourceButton from "./Button";
import { useRouter } from "next/router";
import SVG from "./SVG";
import Link from "next/link";
import { Dimmer } from "@carbonplan/components";

function getMenuLinks(profile) {
  if (!profile || !profile.identity_id) {
    return { links: [
        {
          text: "Sign In",
          href: "/auth/login"
        }
      ],
      showLogout: false
    }
  } else {
    if (!profile.verified) {
      return { links: [
          {
            text: "Verify Account",
            href: "/auth/verification"
          }
        ],
        showLogout: false
      }
    }

    if (!profile.account_id) {
      return { links: [
          {
            text: "Claim Username",
            href: "/account/username"
          }
        ],
        showLogout: false
      }
    }

    var links = [
      {
        text: "Profile",
        href: "/kbgg"
      }
    ]
    console.log(profile.flags)
    if (profile.flags.includes("create_repository")) {
      links.push({
        text: "New Repository",
        href: "/repositories/new"
      })
    }

    if (profile.flags.includes("admin")) {
      links.push({
        text: "Admin Dashboard",
        href: "/admin"
      })
    }

    links.push(
      {
        text: "Settings",
        href: "/account/profile"
      }
    )

    return {links: links, showLogout: true}
  }
}

export function NavMenu() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState({});
  const [linkData, setLinkData] = useState(getMenuLinks(profile));
  console.log(profile)

  useEffect(() => {
    if (sessionStorage.getItem("source_profile")) {
      const profile = JSON.parse(sessionStorage.getItem("source_profile"));
      setProfile(profile);
      setLinkData(getMenuLinks(profile));
    }
  }, []);

  const handleLogout = async () => {
    try {
      await ory
        .updateLogoutFlow({
          // @ts-ignore
          token: profile.logout_token,
        })
        .then(() => {
          sessionStorage.setItem(
            "source_profile",
            JSON.stringify({})
          );
          setProfile({});
          setLinkData(getMenuLinks({}));
          router.push("/auth/login");
        });
    } catch (error) {}
  };

  useEffect(() => {
    ory
      .toSession()
      .then(({ data }) => {
        fetch(process.env.NEXT_PUBLIC_API_BASE + "/auth/whoami", {credentials: "include"}).then((res) => {
          if (res.ok) {
            res.json().then((profile) => {
              ory.createBrowserLogoutFlow().then(({ data }) => {
                profile.logout_token = data.logout_token
                sessionStorage.setItem(
                  "source_profile",
                  JSON.stringify(profile)
                )
                setProfile(profile);
                setLinkData(getMenuLinks(profile));
              });
            })
          } else {
            // Auth Error (invalid session) or server error
            sessionStorage.setItem(
              "source_profile",
              JSON.stringify({})
            );
            setProfile({})
            setLinkData(getMenuLinks({}));
          }
        })
      })
      .catch(() => {
        // Not Logged In
        sessionStorage.setItem(
          "source_profile",
          JSON.stringify({})
        );
        setProfile({})
        setLinkData(getMenuLinks({}));
      });
  }, []);

  return (
    <>
      <Box sx={{
        display: ["inherit", "inherit", "none", "none"],
        position: "fixed", 
        top: 0, 
        right: 0, 
        left: 0, 
        bottom: 0, 
        backgroundColor: "menuBackground", 
        opacity: expanded ? 1 : 0,
        pointerEvents: expanded ? "all" : "none"}}>
        
        <Box
          sx={{
            display: "initial",
            position: ["fixed"],
            right: [13],
            bottom: [17, 17, 15, 15],
            zIndex: 9999999,
          }}
        >
          <Dimmer />
        </Box>
      </Box>

      <Box sx={{position: "relative"}}>
        <Box sx={{display: ["none", "none", "inline", "none"], position: "absolute", top: "50%", transform: "translate(-150%, -50%)"}}>
          <Dimmer />
        </Box>
        <Image 
          variant="navProfileImage"
          // @ts-ignore
          src={profile.profile_image} 
          alt="Profile Image"
          sx={{
            // @ts-ignore
            display: ["none", "none", "none", profile?.profile_image ? "inherit" : "none"]
          }}
          onMouseEnter={() => {
            setExpanded(true);
          }}
          onClick={() => {
            setExpanded(true);
          }} />

        <Box sx={{height: ["35px", "50px", "50px", "50px"], position: "relative", zIndex: 9999, display: ["inherit", "inline", "inline", "none"]}}>
          <SVG viewBox="0 0 16 16" sx={{fill: "menuPrimary", height: ["35px", "50px", "50px", "50px"], width: ["35px", "50px", "50px", "50px"], cursor: "pointer"}} 
            onClick={() => {
              setExpanded(!expanded);
            }}
          >
            <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
          </SVG>
        </Box>
        <Box 
          onMouseLeave={() => {
            setExpanded(false);
          }}
          sx={{
            position: "absolute",
            right: 0,
            width: "max-content",
            height: "max-content",
            opacity: expanded ? 1 : 0,
            pointerEvents: expanded ? "all" : "none",
            backgroundColor: "menuBackground",
            zIndex: 999,
            mt: [0,0,1,1]
          }}>
          <Grid sx={{backgroundColor: "menuBackground", justifyItems: "right", gridTemplateRows: "1fr", gridGap: 0, pt: [3,3,0,0] }}>
            <Box sx={{display: ["initial", "initial", "none", "none"]}}>
              <Link href="/repositories">
                <SourceButton><Text sx={{fontSize: [4,4,2,2]}}>Browse Repositories</Text></SourceButton>
              </Link>
            </Box>
            {
              linkData.links.map((link, i) => {
                return (
                    <Box>
                      <Link href={link.href}>
                        <SourceButton><Text sx={{fontSize: [4,4,2,2]}}>{link.text}</Text></SourceButton>
                      </Link>
                    </Box>
                );
              })
            }
            {
              linkData.showLogout ? <SourceButton onClick={handleLogout}><Text sx={{fontSize: [4,4,2,2]}}>Sign Out</Text></SourceButton> : <></>
            }
          </Grid>
        </Box>
      </Box>
      
    </>);
}
