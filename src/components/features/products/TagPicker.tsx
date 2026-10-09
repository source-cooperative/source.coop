"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Flex,
  IconButton,
  Popover,
  Text,
  TextField,
} from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import type { ControlProps } from "@/components/core/DynamicForm";

interface TagPickerProps extends Partial<ControlProps> {
  /** The form field each chosen tag is submitted under, once per tag. */
  name: string;
  /** The approved corpus, listed for picking. */
  options: string[];
  /** Tags already on the product, kept even when the corpus no longer has them. */
  defaultValue?: string[];
  /** Tags someone suggested that an admin hasn't reviewed yet. */
  pending?: string[];
  /**
   * Suggests a tag the corpus doesn't have. Resolves to the tag as stored, or
   * to a message saying why it was refused. Without it, there's no way to
   * suggest one.
   */
  onSuggest?: (tag: string) => Promise<{ tag: string } | { error: string }>;
}

export function TagPicker({
  name,
  options,
  defaultValue = [],
  pending: initialPending = [],
  onSuggest,
  ...controlProps
}: TagPickerProps) {
  const [tags, setTags] = useState(defaultValue);
  const [pending, setPending] = useState(initialPending);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [suggesting, startSuggesting] = useTransition();

  const query = filter.trim().toLowerCase();
  const matches = options.filter((tag) => tag.toLowerCase().includes(query));
  // Offered even when other tags partly match: someone after "ocean
  // acidification" shouldn't have to settle for "ocean".
  const canSuggest = onSuggest && query && !options.includes(query);

  const toggle = (tag: string, on: boolean) =>
    setTags((tags) => (on ? [...tags, tag] : tags.filter((t) => t !== tag)));

  const suggest = () =>
    startSuggesting(async () => {
      const result = await onSuggest!(filter);
      if ("error" in result) return setError(result.error);
      if (!options.includes(result.tag)) {
        setPending((pending) => [...pending, result.tag]);
      }
      setTags((tags) =>
        tags.includes(result.tag) ? tags : [...tags, result.tag]
      );
      setFilter("");
    });

  return (
    <Flex gap="2" wrap="wrap" align="center">
      {tags.map((tag) => (
        <Badge
          key={tag}
          color={pending.includes(tag) ? "amber" : "gray"}
          size="2"
          title={pending.includes(tag) ? "Awaiting review" : undefined}
        >
          {tag}
          {pending.includes(tag) && " (pending)"}
          <IconButton
            type="button"
            size="1"
            variant="ghost"
            color="gray"
            aria-label={`Remove ${tag}`}
            onClick={() => toggle(tag, false)}
          >
            <Cross2Icon />
          </IconButton>
          <input type="hidden" name={name} value={tag} />
        </Badge>
      ))}
      <Popover.Root
        onOpenChange={() => {
          setFilter("");
          setError("");
        }}
      >
        <Popover.Trigger>
          <Button {...controlProps} type="button" size="1" variant="soft">
            {tags.length ? "Edit tags" : "Add tags"}
          </Button>
        </Popover.Trigger>
        <Popover.Content width="280px" aria-label="Choose tags">
          <Flex direction="column" gap="2">
            <TextField.Root
              size="2"
              placeholder="Filter tags"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setError("");
              }}
              // Enter would submit the form behind the popover.
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            />
            {/* ponytail: renders every tag; fine to a few hundred, virtualise
                the list if the corpus grows past that. */}
            <Flex
              direction="column"
              gap="1"
              style={{ maxHeight: 240, overflowY: "auto" }}
            >
              {matches.map((tag) => (
                <Text as="label" size="2" key={tag}>
                  <Flex gap="2" align="center" py="1">
                    <Checkbox
                      checked={tags.includes(tag)}
                      onCheckedChange={(on) => toggle(tag, on === true)}
                    />
                    {tag}
                  </Flex>
                </Text>
              ))}
              {!matches.length && (
                <Text size="2" color="gray">
                  {options.length
                    ? `No tag matches “${filter}”.`
                    : "No tags to choose from yet."}
                </Text>
              )}
            </Flex>
            {canSuggest && (
              <Button
                type="button"
                size="1"
                variant="ghost"
                loading={suggesting}
                onClick={suggest}
              >
                Suggest “{query}” as a new tag
              </Button>
            )}
            {error && (
              <Text size="1" color="red" role="alert">
                {error}
              </Text>
            )}
          </Flex>
        </Popover.Content>
      </Popover.Root>
    </Flex>
  );
}
