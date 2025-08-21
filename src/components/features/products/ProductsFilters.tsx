"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TextField, Button, Flex } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useDebounce } from "@/hooks/useDebounce";

export function ProductsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read current values from URL
  const currentSearch = searchParams.get("search") || "";
  const currentTags = searchParams.get("tags") || "";
  const hasActiveFilters = currentSearch || currentTags;

  // Local state for search and tags input
  const [searchInput, setSearchInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // Set search and tags input values from URL on mount
  useEffect(() => {
    setSearchInput(currentSearch);
    setTagsInput(currentTags);
  }, [searchParams]);

  // Update filters when search or tags change
  const debouncedSearch = useDebounce(searchInput, 500);
  const debouncedTags = useDebounce(tagsInput, 500);
  useEffect(() => {
    updateFilters(debouncedSearch, debouncedTags);
  }, [debouncedSearch, debouncedTags]);

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
    setSearchInput("");
    setTagsInput("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <Flex gap="3" mb="4" wrap="wrap">
      <TextField.Root
        size="1"
        style={{ minWidth: "300px" }}
        placeholder="Search products..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        disabled={isPending}
      />

      <TextField.Root
        size="1"
        style={{ minWidth: "250px" }}
        placeholder="Filter by tags (comma-separated)"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
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
