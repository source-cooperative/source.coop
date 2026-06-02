"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button, Callout, Flex, Spinner, Text } from "@radix-ui/themes";
import { refreshProxyCredentials } from "@/lib/services/proxy-credentials-cache";
import { withTimeout } from "@/lib/with-timeout";

type Status = "loading" | "error";

// Bound the mint -> refresh -> still-no-cookie -> mint loop that can only occur
// if the cookie can't be written/read (e.g. misconfigured PROXY_CREDS_COOKIE_KEY).
// We allow a couple of quick refreshes per route, then surface an error instead
// of looping forever. Attempts spaced further apart are treated as new episodes.
const MAX_QUICK_ATTEMPTS = 2;
const EPISODE_WINDOW_MS = 15_000;
// Bound how long we wait on the mint action before surfacing an error, so a
// hung network request can't leave the gate spinning indefinitely.
const REFRESH_TIMEOUT_MS = 20_000;
// After router.refresh() succeeds we expect this gate to unmount (the server
// re-renders the listing). router.refresh() preserves this client instance, so
// the mount effect won't re-run on its own — if we're still mounted after this
// long, the refresh didn't expose the credentials, so re-attempt. The loop
// guard above bounds the retries and surfaces an error instead of spinning.
const POST_REFRESH_RECHECK_MS = 3_000;

/**
 * Rendered by the product directory page when an authenticated user opens a
 * restricted product without a fresh proxy-credentials cookie. Mints the
 * credentials via a Server Action (which runs in action phase, where writing
 * the cookie is legal) and then refreshes the route so the server re-renders
 * with the credentials available.
 */
export function ProxyCredentialsGate() {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>("loading");
  const startedRef = useRef(false);
  const recheckRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const attempt = useCallback(async () => {
    setStatus("loading");
    if (recheckRef.current) clearTimeout(recheckRef.current);
    const key = `sc_creds_gate:${pathname}`;
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

      // Track quick consecutive refreshes to detect a write/read loop.
      let count = 1;
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const prev = JSON.parse(raw) as { count: number; ts: number };
          if (Date.now() - prev.ts < EPISODE_WINDOW_MS) count = prev.count + 1;
        }
        sessionStorage.setItem(key, JSON.stringify({ count, ts: Date.now() }));
      } catch {
        // sessionStorage unavailable — fall back to a single refresh.
      }

      if (count > MAX_QUICK_ATTEMPTS) {
        setStatus("error");
        return;
      }
      router.refresh();
      // If the refresh resolves the credentials, this gate unmounts and the
      // cleanup below clears this timer. If it doesn't (cookie still missing),
      // re-attempt so the loop guard can eventually surface the error.
      recheckRef.current = setTimeout(() => {
        void attempt();
      }, POST_REFRESH_RECHECK_MS);
    } catch {
      setStatus("error");
    }
  }, [pathname, router]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void attempt();
    return () => {
      if (recheckRef.current) clearTimeout(recheckRef.current);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    try {
      sessionStorage.removeItem(`sc_creds_gate:${pathname}`);
    } catch {
      // ignore
    }
    void attempt();
  }, [attempt, pathname]);

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
