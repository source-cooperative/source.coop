import { Button } from "@radix-ui/themes";
import { EyeOpenIcon } from "@radix-ui/react-icons";
import { startImpersonation } from "@/lib/actions/admin";

/**
 * Admin control (shown next to a user's profile Edit button) that starts
 * viewing the app as that user. Rendering is gated by the caller — only an
 * admin viewing someone else's profile sees it. The server action re-checks
 * admin, so it is safe even if the button leaks into other renders.
 */
export function ViewAsButton({ targetAccountId }: { targetAccountId: string }) {
  return (
    <form action={startImpersonation}>
      <input type="hidden" name="account_id" value={targetAccountId} />
      <Button type="submit" variant="soft" size="2">
        <EyeOpenIcon /> View as user
      </Button>
    </form>
  );
}
