"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spinner, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useDebounce } from "@/hooks/useDebounce";

/**
 * The search box. Typing is debounced into the `q` query param, and the page
 * does the searching on the server, so the URL is the single source of truth
 * and the results a reader sees are the ones the address bar describes.
 */
export function AdminUserSearchField({ query }: { query: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(query);
  const [isPending, startTransition] = useTransition();
  const debounced = useDebounce(value.trim(), 400);

  useEffect(() => {
    if (debounced === query) return;
    startTransition(() => {
      router.replace(
        debounced ? `${pathname}?q=${encodeURIComponent(debounced)}` : pathname,
      );
    });
  }, [debounced, query, pathname, router]);

  return (
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
        <Spinner loading={isPending} />
      </TextField.Slot>
    </TextField.Root>
  );
}
