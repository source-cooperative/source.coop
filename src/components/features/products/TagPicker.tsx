"use client";

import { useState } from "react";
import { Badge, Button, Flex, IconButton, Popover } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import type { ControlProps } from "@/components/core/DynamicForm";
import { canonTag } from "@/lib/tags/canon";
import { TAG_CATEGORIES, type TagCategory } from "@/lib/tags/categories";
import { TagMenu } from "./TagMenu";

interface TagPickerProps extends Partial<ControlProps> {
  /** The form field each chosen tag is submitted under, once per tag. */
  name: string;
  /** The approved corpus, listed for picking. */
  options: string[];
  /** Each option's category, which the list groups by. */
  categories?: Record<string, TagCategory>;
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
  categories = {},
  defaultValue = [],
  pending = [],
  suggestName,
  ...controlProps
}: TagPickerProps) {
  // Some products carry an empty tag from before tags were picked from a list.
  // It isn't a tag, and submitting it would fail the corpus check.
  const [tags, setTags] = useState(() => defaultValue.filter(Boolean));
  // Suggested here, and only sent for review once the form is saved, so a
  // suggestion never outlives a product that wasn't.
  const [fresh, setFresh] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  // The product's tags as the menu opened, listed first; held still while it
  // is open, so a toggled tag stays where it is under the cursor.
  const [pinned, setPinned] = useState<string[]>([]);

  // In the tags' own spelling, so "sea ice" finds and suggests "sea-ice".
  const query = canonTag(filter);
  const matches = options.filter((tag) => tag.toLowerCase().includes(query));
  // Offered even when other tags partly match: someone after "ocean
  // acidification" shouldn't have to settle for "ocean".
  const canSuggest =
    suggestName &&
    query &&
    !options.includes(query) &&
    !tags.includes(query) &&
    !fresh.includes(query);

  const item = (tag: string) => ({ tag, selected: tags.includes(tag) });
  const listed = matches.filter((t) => !pinned.includes(t));
  // Under their categories, in the order TAG_CATEGORIES gives; a list with no
  // categories at all stays one list rather than all of it under "Other".
  const sections = listed.some((t) => categories[t])
    ? [
        ...TAG_CATEGORIES.map(({ id, label, description }) => ({
          title: label,
          description,
          items: listed.filter((t) => categories[t] === id).map(item),
        })),
        {
          title: "Other",
          description: "Tags not given a category yet.",
          items: listed.filter((t) => !categories[t]).map(item),
        },
      ]
    : [{ title: query ? `Matching “${query}”` : "All tags", items: listed.map(item) }];
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
    <Flex gap="2" wrap="wrap" align="center">
      {tags.map((tag) => chip(tag, false))}
      {fresh.map((tag) => chip(tag, true))}
      <Popover.Root
        onOpenChange={(open) => {
          setFilter("");
          if (open) setPinned(tags);
        }}
      >
        <Popover.Trigger>
          <Button {...controlProps} type="button" size="1" variant="soft">
            {tags.length || fresh.length ? "Edit tags" : "Add tags"}
          </Button>
        </Popover.Trigger>
        <Popover.Content width="320px" aria-label="Choose tags" style={{ padding: 0 }}>
          <TagMenu
            multiple
            query={filter}
            onQueryChange={setFilter}
            placeholder="Filter tags"
            sections={[
              { title: "On this product", items: pinned.filter((t) => t.includes(query)).map(item) },
              ...sections,
            ]}
            onChoose={(tag) => toggle(tag, !tags.includes(tag))}
            action={
              canSuggest
                ? { label: `Suggest “${query}” as a new tag`, onChoose: suggest }
                : undefined
            }
            empty={options.length ? `No tag matches “${filter}”.` : "No tags to choose from yet."}
          />
        </Popover.Content>
      </Popover.Root>
    </Flex>
  );
}
