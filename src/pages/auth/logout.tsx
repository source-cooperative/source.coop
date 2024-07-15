import { useEffect } from "react";
import { useRouter } from "next/router";
import ory from "@/pkg/sdk";
import { Container, Heading } from "theme-ui";
import { Dimmer } from "@carbonplan/components";
import { Logo } from "@/components/Logo";
import { Box } from "theme-ui";
import Link from "next/link";

export default function Login() {
    const router = useRouter();

    useEffect(() => {
        const {
            return_to: returnTo,
        } = router.query;

        ory
        .toSession()
        .then(({ data }) => {
            ory.createBrowserLogoutFlow().then(({ data }) => {
                ory
                .updateLogoutFlow({
                    token: data.logout_token,
                })
                .then(() => {
                  router.push(returnTo ? returnTo as string : "/");
                });
            });
        })
        .catch(() => {
            router.push("/");
        });
    }, []);
    
  return (
    <Container
      sx={{
        width: ["100%", "80%", "50%", "40%"],
        maxWidth: "500px",
        py: 5,
        textAlign: "center",
      }}
    >
      <Box sx={{ alignItems: "center", textAlign: "center" }}>
        <Link href="/">
          <Logo
            sx={{
                  width: "100%",
                  fill: "background",
                  backgroundColor: "primary",
                  p: 3
            }}/>
        </Link>
      </Box>
      <Box mt={3}>
        <Heading as="h2">Signing Out...</Heading>
      </Box>
      <Box
        sx={{
          display: ["none", "none", "initial", "initial"],
          position: ["fixed"],
          right: [13],
          bottom: [17, 17, 15, 15],
        }}
      >
        <Dimmer />
      </Box>
    </Container>);
}
