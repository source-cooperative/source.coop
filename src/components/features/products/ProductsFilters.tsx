"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TextField, Button, Flex } from "@radix-ui/themes";
import { Cross2Icon, StarFilledIcon } from "@radix-ui/react-icons";
import { useDebounce } from "@/hooks/useDebounce";
import { TagPicker } from "./TagPicker";

interface ProductsFiltersProps {
  /** The known corpus of tags to filter by. */
  tagOptions: string[];
}

export function ProductsFilters({ tagOptions }: ProductsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read current values from URL
  const currentSearch = searchParams.get("search") || "";
  const currentTags = searchParams.get("tags") || "";
  const currentFeatured = searchParams.get("featured") === "1";
  const hasActiveFilters = currentSearch || currentTags || currentFeatured;

  // Local state, initialized from the URL to prevent a race condition. Tags
  // are kept here too so a ticked box shows before the page reloads.
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [tags, setTags] = useState(currentTags.split(",").filter(Boolean));

  // Follow the URL when it changes underneath us (clear, back, forward)
  useEffect(() => {
    setSearchInput(currentSearch);
    setTags(currentTags.split(",").filter(Boolean));
  }, [searchParams]);

  const debouncedSearch = useDebounce(searchInput, 500);
  useEffect(() => {
    setFilter("search", debouncedSearch);
  }, [debouncedSearch]);

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset pagination when filters change
    params.delete("cursor");
    params.delete("previous");
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    startTransition(() => {
      router.push(newUrl);
    });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setTags([]);
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <Flex gap="3" mb="4" wrap="wrap" align="center">
      <TextField.Root
        size="1"
        style={{ minWidth: "300px" }}
        placeholder="Search products..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />

      <TagPicker
        options={tagOptions}
        value={tags}
        label="Filter by tags"
        onChange={(next) => {
          setTags(next);
          setFilter("tags", next.join(","));
        }}
      />

      <Button
        size="1"
        variant={currentFeatured ? "solid" : "soft"}
        color={currentFeatured ? "orange" : "gray"}
        onClick={() => setFilter("featured", currentFeatured ? "" : "1")}
        disabled={isPending}
      >
        <StarFilledIcon />
        Featured
      </Button>

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
