"use client";
import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";
import { Container, Box, Text, Flex } from "@radix-ui/themes";
import { UpdateIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const [logoutUrl, setLogoutUrl] = useState();
  const router = useRouter();

  useEffect(() => {
    console.log(CONFIG.auth.routes.logout);
    const logout = async () => {
      const returnTo = new URL(window.location.href);
      const response = await fetch(
        `${CONFIG.auth.routes.logout}?return_to=${returnTo.origin}`,
        { headers: { Accept: "application/json" } }
      );
      if (response.status !== 200) {
        // If the logout fails (e.g. the user is not logged in), redirect to the home page
        router.push("/");
      }
      const data = await response.json();
      setLogoutUrl(data.logout_url);
    };
    logout().catch(console.error);
  }, []);

  if (logoutUrl) {
    router.push(logoutUrl);
  }

  return (
    <Container size="2" py="9">
      <Flex direction="column" align="center" gap="4">
        <Box>
          <UpdateIcon
            width="24"
            height="24"
            style={{
              color: "var(--gray-8)",
              animation: "spin 1s linear infinite",
            }}
          />
        </Box>
        <Text size="4" weight="medium">
          Until next time!
        </Text>
      </Flex>
    </Container>
  );
}
