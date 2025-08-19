"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TextField, Button, Flex } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";

export function ProductsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read current values from URL
  const currentSearch = searchParams.get("search") || "";
  const currentTags = searchParams.get("tags") || "";

  const updateFilters = (search: string, tags: string) => {
    const params = new URLSearchParams(searchParams);

    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }

    if (tags) {
      params.set("tags", tags);
    } else {
      params.delete("tags");
    }

    // Reset pagination when filters change
    params.delete("next");

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    startTransition(() => {
      router.push(newUrl);
    });
  };

  const handleClearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = currentSearch || currentTags;

  return (
    <Flex gap="3" mb="4" wrap="wrap">
      <TextField.Root
        size="1"
        style={{ minWidth: "300px" }}
        placeholder="Search products..."
        value={currentSearch}
        onChange={(e) => updateFilters(e.target.value, currentTags)}
        disabled={isPending}
      />

      <TextField.Root
        size="1"
        style={{ minWidth: "250px" }}
        placeholder="Filter by tags (comma-separated)"
        value={currentTags}
        onChange={(e) => updateFilters(currentSearch, e.target.value)}
        disabled={isPending}
      />

      {hasActiveFilters && (
        <Button
          size="1"
          variant="soft"
          color="gray"
          onClick={handleClearFilters}
          disabled={isPending}
        >
          <Cross2Icon />
          Clear Filters
        </Button>
      )}
    </Flex>
  );
}
