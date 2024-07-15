import { Box, Text, Select, Spinner, Container, Alert, Divider, Grid } from "theme-ui";
import { Meta } from "./Meta";
import { Dimmer } from "@carbonplan/components";
import { Footer } from "./Footer";
import Link from "next/link";
import Error from "./Error";
import NotFound from "./NotFound";

import { Logo } from "./Logo";
import Button from "./Button";
import { SearchBar } from "./SearchBar";
import { NavMenu } from "./NavMenu";
import SourceLink from "./SourceLink";
import { useState } from "react";
import SVG from "./SVG";
import { Flex } from "theme-ui";
import { CodeBlock } from "./CodeBlock";
import { useEffect } from "react";
import SideNav from "./SideNav";
import UserNavButton from "./UserNavButton";

const alerts = [
  {
    type: "warning",
    message: "NOTE: This service is under active development. Certain features may not work or become unavailable at any time."
  }
]

export function Loading() {
  return (
    <Container
      sx={{
        height: "100%",
        textAlign: "center",
      }}
    >
      <Spinner />
    </Container>
  );
}

export function Layout({
  title = null,
  children = null,
  sideNavLinks = null,
  error = false,
  notFound = false,
  messages = [],
}) {
  let content = children;


  if (error) {
    content = <Error />;
  } else if (notFound) {
    content = <NotFound />;
  }
              //<Button variant="nav" href="/repositories" sx={{textAlign: "right", display: "inline-block"}}>Browse Repositories</Button>

  return (
    <>
      <Meta
        description={
          "Source Cooperative is a neutral, non-profit data-sharing utility that allows trusted organizations to share data without purchasing a data portal SaaS subscription or managing infrastructure. Source allows organizations to share data using standard HTTP methods rather than requiring proprietary APIs or SaaS interfaces. It is currently in private beta."
        }
        title={title ? title : "Source Cooperative"}
        card=""
      />
      <Flex sx={{minHeight: "100vh;", flexDirection: "column", justifyContent: "space-between"}}>
        <Box>
          <Box sx={{zIndex: 9999999}}>
            {
              alerts.map((alert, i) => {
                return (
                  <Alert key={"alert-" + i} variant={alert.type}>
                    {alert.message}
                  </Alert>
                )
              })
            }
          </Box>
        
        <Container sx={{
          position: "sticky",
          backgroundColor: "background",
          zIndex: 9999,
          top: 0,
          py: 2
        }}>
          <Box sx={{
            width: ["100%", "100%", "100%", "70%"],
            margin: "0 auto"
          }}>
            <Grid sx={{
              gridTemplateColumns: ["auto 1fr", "auto 3fr auto", "auto 1fr 1fr", "auto 1fr 1fr"]
            }}>
              <Flex sx={{justifyContent: "left", maxWidth: ["100%", "400px", "400px", "400px"], alignContent: "center", gridRowStart: [2,1,1,1], gridColumnStart: [1,2,2,2], gridColumnEnd: ["end",3, 3, 3]}}>
                <Box sx={{alignSelf: "center", width: "100%"}}>
                  <SearchBar/>
                </Box>
              </Flex>
              <Flex sx={{alignContent: "center", justifySelf: ["left", "left", "left", "left"], gridColumnStart: [1,1,1,1]}}>
                  <Link href="/">
                      <Logo
                        sx={{
                          height: ["45px", "45px", "55px", "55px"],
                          fill: "background",
                          backgroundColor: "primary",
                          p: 2,
                          "&:hover": {
                            fill: "highlight"
                          }
                        }}
                      />
                  </Link>
              </Flex>
              <Flex sx={{justifySelf: "right", alignContent: "center", gridColumnEnd: "end"}}>
                <Box sx={{alignSelf: "center"}}>
                  <UserNavButton />
                </Box>
              </Flex>

            </Grid>
          </Box>
        </Container>

        <Container>
          <Grid sx={{
            gridTemplateColumns: ["100%", "100%", "15% 85%", "15% 70% 15%"],
            gridGap: 0
          }}>
            <Flex sx={{alignContent: "center", backgroundColor: "background", zIndex: 9999, justifyContent: "right", mr: [0,0,3,3], pb: [1,1,0,0], top: ["65.5px", "65.5px", null, null], position: ["sticky", "sticky", null, null]}}>
              { !notFound && !error && sideNavLinks ? <SideNav links={sideNavLinks} /> : <></> }
            </Flex>
            <Box sx={{gridRowStart: [2,2,1,1], gridColumnStart: [1,1, sideNavLinks ? 2 : 1, 2], gridColumnEnd: [null, null, sideNavLinks ? null : 3, null]}}>
              <Box sx={{mb: [messages.length > 0 ? 2 : 0]}}>
                {
                  messages.map((message, i) => {
                    return (
                      <Alert key={"message-" + i} variant={message.type}>
                        {message.message}
                      </Alert>
                    )
                  })
                }
              </Box>
              {content}
            </Box>
          </Grid>
        </Container>
      </Box>

      <Grid sx={{ 
        gridTemplateColumns: [null, null, sideNavLinks ? "1fr 5fr" : "1fr 5fr 1fr", "1fr 3fr 1fr"],
        gridTemplateRows: ["1fr", "1fr", null, null],
        height: "max-content",
        gridGap: [0,0,3,3]
      }}>
        <Box sx={{gridColumnStart: [null, null, "1", "2"], gridColumnEnd: [null, null, "4", "3"], mx: [0,0,0,2]}}>
          <Footer />
        </Box>
      </Grid>
      
      </Flex>

      <Box
        sx={{
          display: ["none", "none", "initial", "initial"],
          position: ["fixed"],
          left: [null, 13, 13, 13],
          bottom: [null, null, 15, 15],
          zIndex: 99999,
        }}
      >
        <Dimmer />
      </Box>
    </>
  );
}
