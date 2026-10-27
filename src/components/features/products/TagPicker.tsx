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

interface TagPickerProps extends Partial<ControlProps> {
  /** The form field each chosen tag is submitted under, once per tag. */
  name?: string;
  /** The known corpus: the only tags that can be added. */
  options: string[];
  /** Tags already on the product, kept even when the corpus no longer has them. */
  defaultValue?: string[];
  /** The chosen tags, for a parent that keeps them itself. */
  value?: string[];
  /** Called with the chosen tags each time one is added or removed. */
  onChange?: (tags: string[]) => void;
  /** The button's text, in place of "Add tags" or "Edit tags". */
  label?: string;
}

export function TagPicker({
  name,
  options,
  defaultValue = [],
  value,
  onChange,
  label,
  ...controlProps
}: TagPickerProps) {
  const [ownTags, setTags] = useState(defaultValue);
  const tags = value ?? ownTags;
  const [filter, setFilter] = useState("");

  const matches = options.filter((tag) =>
    tag.toLowerCase().includes(filter.trim().toLowerCase())
  );
  const toggle = (tag: string, on: boolean) => {
    const next = on ? [...tags, tag] : tags.filter((t) => t !== tag);
    setTags(next);
    onChange?.(next);
  };

  return (
    <Flex gap="2" wrap="wrap" align="center">
      {tags.map((tag) => (
        <Badge key={tag} color="gray" size="2">
          {tag}
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
          {name && <input type="hidden" name={name} value={tag} />}
        </Badge>
      ))}
      <Popover.Root onOpenChange={() => setFilter("")}>
        <Popover.Trigger>
          <Button {...controlProps} type="button" size="1" variant="soft">
            {label ?? (tags.length ? "Edit tags" : "Add tags")}
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
          </Flex>
        </Popover.Content>
      </Popover.Root>
    </Flex>
  );
}
