'use client';

import { Button } from "@radix-ui/themes";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";

interface PaginationProps {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
  currentCursor?: string;
}

export function Pagination({
  hasNextPage,
  hasPreviousPage,
  nextCursor,
  previousCursor,
  currentCursor,
}: PaginationProps) {
  if (!hasNextPage && !hasPreviousPage) return null;

  return (
    <div
      style={{
        marginTop: "2rem",
        padding: "1rem 0",
        borderTop: "1px solid var(--gray-6)",
        textAlign: "center",
      }}
    >
      <Link
        href={
          hasPreviousPage
            ? previousCursor
              ? `/?cursor=${previousCursor}`
              : "/"
            : "#"
        }
        style={{ textDecoration: "none" }}
      >
        <Button
          variant="soft"
          size="2"
          disabled={!hasPreviousPage}
          style={{ marginRight: "0.5rem" }}
        >
          <ChevronLeftIcon /> Previous
        </Button>
      </Link>

      <Link
        href={
          hasNextPage && nextCursor
            ? currentCursor
              ? `/?cursor=${nextCursor}&previous=${currentCursor}`
              : `/?cursor=${nextCursor}`
            : "#"
        }
        style={{ textDecoration: "none" }}
      >
        <Button variant="soft" size="2" disabled={!hasNextPage}>
          Next <ChevronRightIcon />
        </Button>
      </Link>
    </div>
  );
}
