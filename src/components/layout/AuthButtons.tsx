import { AccountDropdown } from "./AccountDropdown";
import { Button, Callout, Link } from "@radix-ui/themes";
import { CONFIG } from "@/lib/config";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { onboardingUrl } from "@/lib/urls";
import { UserSession } from "@/types";

interface AuthButtonsProps {
  session: UserSession | null;
}

export function AuthButtons({ session }: AuthButtonsProps) {
  if (session?.account) {
    return <AccountDropdown session={session} />;
  }

  if (session && !session.account) {
    return (
      <Callout.Root color="yellow">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          You do not yet have a profile. Please click{" "}
          <Link href={onboardingUrl()}>here</Link> to complete your profile.
        </Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Link href={CONFIG.auth.routes.login}>
      <Button>Log In / Register</Button>
    </Link>
  );
}
