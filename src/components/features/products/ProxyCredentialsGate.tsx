"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Callout, Flex, Spinner, Text } from "@radix-ui/themes";
import { refreshProxyCredentials } from "@/lib/services/proxy-credentials-cache";
import { withTimeout } from "@/lib/with-timeout";

type Status = "loading" | "error";

// Number of mint+refresh tries before surfacing an error instead of looping.
const MAX_ATTEMPTS = 2;
// Bound the mint action so a hung network request can't spin forever.
const REFRESH_TIMEOUT_MS = 20_000;
// router.refresh() keeps this client instance mounted, so the mount effect won't
// re-fire on its own. If the refresh didn't expose the credentials, re-attempt
// after this delay (bounded by MAX_ATTEMPTS).
const RECHECK_MS = 3_000;

/**
 * Rendered by the product directory page when an authenticated user opens a
 * restricted product without a fresh proxy-credentials cookie. Mints the
 * credentials via a Server Action (cookies are only writable in the action
 * phase) and refreshes the route so the server re-renders with them.
 *
 * If the refresh doesn't expose the cookie (e.g. a misconfigured key makes it
 * unreadable), we re-attempt up to MAX_ATTEMPTS, then show a retryable error
 * rather than spinning indefinitely.
 */
export function ProxyCredentialsGate() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const startedRef = useRef(false);
  const attemptsRef = useRef(0);
  const recheckRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const attempt = useCallback(async () => {
    clearTimeout(recheckRef.current);
    if (++attemptsRef.current > MAX_ATTEMPTS) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const result = await withTimeout(
        refreshProxyCredentials(),
        REFRESH_TIMEOUT_MS,
        "Timed out refreshing proxy credentials",
      );
      if (!result.ok) {
        setStatus("error");
        return;
      }
      // On success this gate unmounts (cleanup clears the timer); otherwise the
      // recheck re-attempts until the cap trips.
      router.refresh();
      recheckRef.current = setTimeout(() => void attempt(), RECHECK_MS);
    } catch {
      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void attempt();
    return () => clearTimeout(recheckRef.current);
  }, [attempt]);

  const retry = useCallback(() => {
    attemptsRef.current = 0;
    void attempt();
  }, [attempt]);

  if (status === "error") {
    return (
      <Callout.Root color="red" role="alert">
        <Callout.Text>
          We couldn&apos;t load your access credentials for this private
          product. Please try again, and if the problem persists, sign out and
          back in.
        </Callout.Text>
        <Flex mt="2">
          <Button variant="soft" onClick={retry}>
            Try again
          </Button>
        </Flex>
      </Callout.Root>
    );
  }

  return (
    <Flex align="center" gap="2" p="2">
      <Spinner />
      <Text color="gray">Fetching access credentials…</Text>
    </Flex>
  );
}
