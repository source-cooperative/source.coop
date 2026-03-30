"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button, Flex } from "@radix-ui/themes";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import type { PaginationProps } from "./ProductsList";

export function Pagination({
  hasNextPage,
  hasPreviousPage,
  nextCursor,
  previousCursor,
  currentCursor,
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!hasNextPage && !hasPreviousPage) return null;

  function buildUrl(params: Record<string, string | undefined>) {
    const url = new URLSearchParams(searchParams);
    // Remove pagination params
    url.delete("cursor");
    url.delete("previous");
    // Set new pagination params
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.set(key, value);
      }
    }
    const qs = url.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const previousUrl = hasPreviousPage
    ? previousCursor
      ? buildUrl({ cursor: previousCursor })
      : buildUrl({})
    : null;

  const nextUrl = hasNextPage
    ? buildUrl({ cursor: nextCursor, previous: currentCursor })
    : null;

  return (
    <Flex justify="center" gap="3" py="4">
      {previousUrl ? (
        <Button asChild variant="soft" size="2">
          <Link href={previousUrl}>
            <ChevronLeftIcon /> Previous
          </Link>
        </Button>
      ) : (
        <Button variant="soft" size="2" disabled>
          <ChevronLeftIcon /> Previous
        </Button>
      )}
      {nextUrl ? (
        <Button asChild variant="soft" size="2">
          <Link href={nextUrl}>
            Next <ChevronRightIcon />
          </Link>
        </Button>
      ) : (
        <Button variant="soft" size="2" disabled>
          Next <ChevronRightIcon />
        </Button>
      )}
    </Flex>
  );
}
