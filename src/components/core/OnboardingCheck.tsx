"use client";

import { redirect, usePathname } from "next/navigation";
import { Account } from "@/types/account";
import { useEffect } from "react";

/**
 * Simple client-side check to redirect to onboarding if the user is not on the
 * onboarding page and does not have an account. It seems like this should be done as
 * middleware but the middleware seems to have problems fetching AWS Accounts using
 * credentials: https://github.com/vercel/next.js/issues/65769
 */
export function OnboardingCheck({ account }: { account?: Account }) {
  useEffect(() => {
    if (pathname !== "/onboarding" && !account) {
      redirect("/onboarding");
    }

    if (pathname === "/onboarding" && account) {
      redirect("/");
    }
  }, []);

  const pathname = usePathname();

  return null;
}
