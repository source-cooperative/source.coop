"use client";
import { Button, Link } from "@radix-ui/themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [hideButton, setHideButton] = useState(false);

  useEffect(() => {
    if (!session || session?.account) return;
    if (pathname !== "/onboarding") {
      router.push("/onboarding");
      setHideButton(true);
    }
  }, [pathname, session, router]);

  if (hideButton) return null;

  return (
    <Link href={CONFIG.auth.routes.login}>
      <Button>Log In / Register</Button>
    </Link>
  );
}
