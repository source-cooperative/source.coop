"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { TextField, Box, Card, Text, Spinner } from "@radix-ui/themes";
import { fetchPrefixes, PrefixSuggestion } from "@/lib/actions/prefixes";
import { useDebounce } from "@/hooks";

interface JumpToPrefixProps {
  accountId: string;
  productId: string;
  currentPath: string[];
  baseUrl: string;
}

export function JumpToPrefix({
  accountId,
  productId,
  currentPath,
  baseUrl,
}: JumpToPrefixProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<PrefixSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the input value
  const debouncedInput = useDebounce(input, 300);

  // Fetch suggestions when debounced input changes
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!debouncedInput.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Parse input to extract base path and search term
        // e.g., "2020/01/feb" -> basePath: "2020/01/", searchTerm: "feb"
        const lastSlashIndex = debouncedInput.lastIndexOf("/");
        const basePath =
          lastSlashIndex >= 0
            ? debouncedInput.substring(0, lastSlashIndex + 1)
            : "";
        const searchTerm =
          lastSlashIndex >= 0
            ? debouncedInput.substring(lastSlashIndex + 1)
            : debouncedInput;

        // Build full search path: currentPath + basePath from input
        const currentPathStr = currentPath.join("/");
        const fullSearchPath = [currentPathStr, basePath]
          .filter(Boolean)
          .join("/");

        const results = await fetchPrefixes({
          accountId,
          productId,
          currentPath: fullSearchPath ? `${fullSearchPath}/` : "",
        });

        // Filter suggestions based on search term only
        const filtered = searchTerm
          ? results.filter((s) =>
              s.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : results;

        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Failed to load suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadSuggestions();
  }, [debouncedInput, accountId, productId, currentPath]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter" && input.trim()) {
        // Navigate to manually entered prefix
        navigateToPrefix(input.trim());
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;

      case "Tab":
        e.preventDefault();
        // Accept current suggestion and continue traversal
        if (suggestions[selectedIndex]) {
          // Parse current input to get base path
          const lastSlashIndex = input.lastIndexOf("/");
          const basePath =
            lastSlashIndex >= 0 ? input.substring(0, lastSlashIndex + 1) : "";
          // Append selected suggestion name with trailing slash to continue traversal
          setInput(basePath + suggestions[selectedIndex].name + "/");
          setShowSuggestions(false);
        }
        break;

      case "Enter":
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          navigateToPrefix(suggestions[selectedIndex].fullPath);
        }
        break;

      case "Escape":
        setShowSuggestions(false);
        setInput("");
        inputRef.current?.blur();
        break;
    }
  };

  const navigateToPrefix = (prefix: string) => {
    // Clean up prefix
    let cleanPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;

    // If prefix is relative (doesn't start with current path),
    // prepend current path for manual entry
    const currentPathStr = currentPath.join("/");
    if (
      currentPathStr &&
      cleanPrefix &&
      !cleanPrefix.startsWith(currentPathStr)
    ) {
      cleanPrefix = `${currentPathStr}/${cleanPrefix}`;
    }

    // Build new path
    const newPath = cleanPrefix
      ? `${baseUrl}/${encodeURIComponent(cleanPrefix)}`
      : baseUrl;

    router.push(newPath);
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleSuggestionClick = (suggestion: PrefixSuggestion) => {
    navigateToPrefix(suggestion.fullPath);
  };

  return (
    <Box style={{ position: "relative", width: "140px" }}>
      <TextField.Root
        ref={inputRef}
        size="1"
        variant="soft"
        placeholder="Go to prefix"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        onBlur={() => {
          // Delay to allow click on suggestion
          setTimeout(() => setShowSuggestions(false), 200);
        }}
      >
        <TextField.Slot>
          {isLoading ? <Spinner /> : <MagnifyingGlassIcon />}
        </TextField.Slot>
      </TextField.Root>

      {showSuggestions && suggestions.length > 0 && (
        <Card
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: "240px",
            overflowY: "auto",
            padding: "4px",
          }}
        >
          {suggestions.map((suggestion, index) => (
            <Box
              key={suggestion.fullPath}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                borderRadius: "4px",
                backgroundColor:
                  index === selectedIndex ? "var(--gray-3)" : "transparent",
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Text size="2">{suggestion.name}</Text>
            </Box>
          ))}
        </Card>
      )}
    </Box>
  );
}
