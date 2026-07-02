"use client";

import { Button } from "@radix-ui/themes";
import { ReactNode } from "react";
import { loginUrl } from "@/lib/urls";

/**
 * Sign-in button that returns the user to the current page after login.
 * Reads window.location at click time so no server-side path plumbing is
 * needed (login lives on the Ory domain, so this is a full-page navigation).
 */
export function LoginButton({
  children = "Log In / Register",
}: {
  children?: ReactNode;
}) {
  return (
    <Button
      onClick={() => {
        window.location.href = loginUrl(window.location.href);
      }}
    >
      {children}
    </Button>
  );
}
