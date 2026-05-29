"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Callout,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";

/**
 * Error boundary for the product route subtree (the product layout, the path
 * page, and its README / preview slots). A failure in any of those — e.g. the
 * data proxy returning a 500 while listing or heading an object — renders this
 * instead of crashing the whole app with the generic "Application error" page.
 */
export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Surface the error in the browser console for debugging; the full
    // server-side error (with stack) is already in the server logs.
    console.error(error);
  }, [error]);

  // reset() alone just re-renders the boundary with the same (cached) server
  // payload, so a server-data error throws again immediately. Refreshing the
  // route first invalidates that cache and genuinely re-fetches, so the retry
  // actually re-runs the failed proxy call.
  const retry = () => {
    router.refresh();
    reset();
  };

  return (
    <Box mt="4">
      <Heading size="4" mb="2">
        Something went wrong loading this product
      </Heading>
      <Callout.Root color="red" role="alert">
        <Callout.Text>
          We couldn&apos;t load this product&apos;s contents right now. This is
          usually temporary — please try again in a moment.
        </Callout.Text>
      </Callout.Root>
      {error.digest && (
        <Text as="p" size="1" color="gray" mt="2">
          Reference: {error.digest}
        </Text>
      )}
      <Flex mt="3">
        <Button variant="soft" onClick={retry}>
          Try again
        </Button>
      </Flex>
    </Box>
  );
}
