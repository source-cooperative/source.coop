"use client";
import { Button, Link } from "@radix-ui/themes";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect } from "react";
import { UserSession } from "@/types";
import { CONFIG } from "@/lib/config";

/**
 * Redirects to the onboarding page if the user has a session but no account.
 *
 * @param session - The user session.
 * @returns null
 */
interface LoginButtonProps {
  session: UserSession | null;
}
export function LoginButton({ session }: LoginButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!session || session?.account) return;
    console.log({ pathname, session, router });
    if (pathname !== "/onboarding") {
      router.push("/onboarding");
    }
  }, [pathname, session, router]);

  return (
    <Link href={CONFIG.auth.routes.login}>
      <Button>Log In / Register</Button>
    </Link>
  );
}
