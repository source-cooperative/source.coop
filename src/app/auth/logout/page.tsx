"use client";
import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";
import { Container, Box } from "@radix-ui/themes";

export default function LogoutPage() {
  const [logoutUrl, setLogoutUrl] = useState();

  useEffect(() => {
    console.log(CONFIG.auth.routes.logout);
    const logout = async () => {
      const returnTo = new URL(window.location.href);
      const response = await fetch(
        `${CONFIG.auth.routes.logout}?return_to=${returnTo.origin}`
      );
      const data = await response.json();
      setLogoutUrl(data.logout_url);
    };
    logout().catch(console.error);
  }, []);

  if (logoutUrl) {
    window.location.href = logoutUrl;
  }

  return (
    <Container size="4" py="6">
      <Box>Logging out...</Box>
    </Container>
  );
}
