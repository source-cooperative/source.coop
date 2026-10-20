"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Spinner, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useDebounce } from "@/hooks/useDebounce";

interface AdminUserSearchFieldProps {
  /** The query the URL currently holds, and so the one `children` answer. */
  query: string;
  /** The results for `query`, dimmed while a newer query is in flight. */
  children?: ReactNode;
}

/**
 * The search box. Typing is debounced into the `q` query param, and the page
 * does the searching on the server, so the URL is the single source of truth
 * and the results a reader sees are the ones the address bar describes.
 *
 * A search is "in flight" from the first keystroke that differs from the URL
 * until the page for the new URL has rendered: the spinner shows through the
 * debounce as well as the round trip, and the results below are dimmed so
 * nobody reads the old answer as the new one.
 */
export function AdminUserSearchField({
  query,
  children,
}: AdminUserSearchFieldProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(query);
  const [isPending, startTransition] = useTransition();
  const debounced = useDebounce(value.trim(), 400);
  const searching = isPending || value.trim() !== query;
  // The query this component last saw in the URL, whether it put it there or
  // not. Keeps the two effects below from feeding each other.
  const urlQuery = useRef(query);

  // The URL changed under us (back/forward, or a link opened into a mounted
  // page): follow it, rather than pushing the stale field value back over it.
  useEffect(() => {
    if (query === urlQuery.current) return;
    urlQuery.current = query;
    setValue(query);
  }, [query]);

  // A local edit settled: push it into the URL. Keyed only off `debounced`, so
  // an external URL change resynced above cannot re-fire it.
  useEffect(() => {
    if (debounced === urlQuery.current) return;
    urlQuery.current = debounced;
    startTransition(() => {
      router.replace(
        debounced ? `${pathname}?q=${encodeURIComponent(debounced)}` : pathname,
      );
    });
  }, [debounced, pathname, router]);

  return (
    <>
      <TextField.Root
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="username, name, or user@example.com"
        aria-label="Search users"
        autoFocus
      >
        <TextField.Slot>
          <MagnifyingGlassIcon />
        </TextField.Slot>
        <TextField.Slot>
          <Spinner size="2" loading={searching} />
        </TextField.Slot>
      </TextField.Root>
      <Box
        aria-busy={searching}
        style={{
          opacity: searching ? 0.4 : 1,
          transition: "opacity 150ms",
        }}
      >
        {children}
      </Box>
    </>
  );
}
