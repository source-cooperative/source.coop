"use client";

import { useState } from "react";
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
import { canonTag } from "@/lib/tags/canon";

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
   * The form field each new tag is submitted under, once per tag, to be
   * suggested when the form is saved. Without it, there's no way to suggest
   * one.
   */
  suggestName?: string;
}

export function TagPicker({
  name,
  options,
  defaultValue = [],
  pending = [],
  suggestName,
  ...controlProps
}: TagPickerProps) {
  const [tags, setTags] = useState(defaultValue);
  // Suggested here, and only sent for review once the form is saved, so a
  // suggestion never outlives a product that wasn't.
  const [fresh, setFresh] = useState<string[]>([]);
  const [filter, setFilter] = useState("");

  // In the tags' own spelling, so "sea ice" finds and suggests "sea-ice".
  const query = canonTag(filter);
  const matches = options.filter((tag) => tag.toLowerCase().includes(query));
  // Offered even when other tags partly match: someone after "ocean
  // acidification" shouldn't have to settle for "ocean".
  const canSuggest =
    suggestName && query && !options.includes(query) && !fresh.includes(query);

  const toggle = (tag: string, on: boolean) =>
    setTags((tags) => (on ? [...tags, tag] : tags.filter((t) => t !== tag)));
  const suggest = () => {
    setFresh((fresh) => [...fresh, query]);
    setFilter("");
  };

  const chip = (tag: string, isNew: boolean) => {
    const label = isNew ? "new" : pending.includes(tag) ? "pending" : null;
    return (
      <Badge
        key={tag}
        color={label ? "amber" : "gray"}
        size="2"
        title={
          isNew
            ? "Suggested for review when you save"
            : label
              ? "Awaiting review"
              : undefined
        }
      >
        {tag}
        {label && ` (${label})`}
        <IconButton
          type="button"
          size="1"
          variant="ghost"
          color="gray"
          aria-label={`Remove ${tag}`}
          onClick={() =>
            isNew
              ? setFresh((fresh) => fresh.filter((t) => t !== tag))
              : toggle(tag, false)
          }
        >
          <Cross2Icon />
        </IconButton>
        <input type="hidden" name={isNew ? suggestName : name} value={tag} />
      </Badge>
    );
  };

  return (
    <Flex direction="column" gap="2">
      <Flex gap="2" wrap="wrap" align="center">
        {tags.map((tag) => chip(tag, false))}
        {fresh.map((tag) => chip(tag, true))}
        <Popover.Root onOpenChange={() => setFilter("")}>
          <Popover.Trigger>
            <Button {...controlProps} type="button" size="1" variant="soft">
              {tags.length || fresh.length ? "Edit tags" : "Add tags"}
            </Button>
          </Popover.Trigger>
          <Popover.Content width="280px" aria-label="Choose tags">
            <Flex direction="column" gap="2">
              <TextField.Root
                size="2"
                placeholder="Filter tags"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
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
                <Button type="button" size="1" variant="ghost" onClick={suggest}>
                  Suggest “{query}” as a new tag
                </Button>
              )}
            </Flex>
          </Popover.Content>
        </Popover.Root>
      </Flex>
      {fresh.length > 0 && (
        <Text size="1" color="gray">
          New tags are suggested for review when you save the product. They
          aren&apos;t kept until then.
        </Text>
      )}
    </Flex>
  );
}
