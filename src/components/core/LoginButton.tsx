"use client";

import { Button } from "@radix-ui/themes";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { loginUrl } from "@/lib/urls";

/**
 * Sign-in link that returns the user to the current page after login.
 *
 * A plain <a> (not next/link): login lives on the Ory flow — an external
 * domain in prod, a middleware-proxied relative path in dev — so it must be a
 * full-page navigation, not a client-side route change.
 *
 * The return_to (current absolute URL) is filled in after mount and refreshed
 * on navigation, since this button sits in the persistent header.
 * ponytail: before mount the href is the bare login URL, so a click in that
 * first frame returns to Ory's default rather than the current page.
 */
export function LoginButton({
  children = "Log In / Register",
}: {
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const [href, setHref] = useState(loginUrl());
  useEffect(() => {
    setHref(loginUrl(window.location.href));
  }, [pathname]);

  return (
    <Button asChild>
      <a href={href}>{children}</a>
    </Button>
  );
}
