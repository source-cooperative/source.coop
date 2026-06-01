"use client";

import { useRouter } from "next/navigation";
import { Box, Button, Callout, Flex, Heading, Text } from "@radix-ui/themes";

/**
 * Rendered by the product page when the data proxy returns AccessDenied (403)
 * for a viewer who IS authorized at the app level (they passed the product's
 * read-authorization check). That mismatch means the signed read was refused by
 * the proxy — typically because freshly minted credentials haven't propagated
 * yet, or a proxy-side auth misconfiguration — not because the user lacks
 * access. We surface a clear, recoverable message instead of the generic error
 * boundary.
 */
export function ProductDataUnavailable() {
  const router = useRouter();
  return (
    <Box mt="4">
      <Heading size="4" mb="2">
        We couldn&apos;t load this product&apos;s files
      </Heading>
      <Callout.Root color="amber" role="alert">
        <Callout.Text>
          Your access to this private product&apos;s data couldn&apos;t be
          confirmed just now. This is usually temporary while your credentials
          finish setting up — please try again in a moment. If it keeps
          happening, sign out and back in.
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
