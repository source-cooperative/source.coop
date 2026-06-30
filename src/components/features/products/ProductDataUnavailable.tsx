"use client";

import { useRouter } from "next/navigation";
import { Box, Button, Callout, Flex } from "@radix-ui/themes";

/**
 * Rendered by the product page when a read through the data proxy fails for a
 * viewer who IS authorized at the app level (they passed the product's
 * read-authorization check). Two cases:
 *  - default copy: the proxy returned AccessDenied (403) — usually freshly
 *    minted credentials that haven't propagated yet, or a proxy auth
 *    misconfiguration — not a real "you can't see this".
 *  - `message` override: the backend was unreachable (proxy hung / 5xx /
 *    unparseable response), so we couldn't load the contents at all.
 *
 * Either way we degrade in place — keeping the product header and Edit link
 * visible — instead of throwing to the route error boundary, which would blank
 * the whole product.
 */
export function ProductDataUnavailable({ message }: { message?: string }) {
  const router = useRouter();
  return (
    <Box mt="4">
      <Callout.Root color="amber" role="alert">
        <Callout.Text>
          {message ??
            "Your access to this private product's data couldn't be confirmed just now."}
        </Callout.Text>
      </Callout.Root>
      <Flex mt="3">
        <Button variant="soft" onClick={() => router.refresh()}>
          Try again
        </Button>
      </Flex>
    </Box>
  );
}
