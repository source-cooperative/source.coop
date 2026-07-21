import { Box, Button, Callout, Flex } from "@radix-ui/themes";
import { EyeOpenIcon, ExitIcon } from "@radix-ui/react-icons";
import { getPageSession } from "@/lib/api/utils";
import { stopImpersonation } from "@/lib/actions/admin";

/**
 * Always-on warning shown while an admin is viewing the app as another user.
 * Renders nothing for a normal session. The session it reads is already the
 * impersonated target (see `applyImpersonation`); `impersonator` carries the
 * real admin so we can name who is really driving and offer an exit.
 */
export async function ImpersonationBanner() {
  const session = await getPageSession();
  if (!session?.impersonator) return null;

  return (
    <Box mb="4">
      <Callout.Root color="amber" role="alert">
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Flex align="center" gap="2">
            <Callout.Icon>
              <EyeOpenIcon />
            </Callout.Icon>
            <Callout.Text>
              You are viewing the app as <strong>{session.account?.name}</strong>
              . Actions you take are performed as this user.
            </Callout.Text>
          </Flex>
          <form action={stopImpersonation}>
            <Button type="submit" variant="solid" color="amber" size="1">
              <ExitIcon /> Exit
            </Button>
          </form>
        </Flex>
      </Callout.Root>
    </Box>
  );
}
