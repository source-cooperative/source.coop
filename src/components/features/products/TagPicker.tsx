"use client";

import React, { useId, useState } from "react";
import { Badge, Flex, IconButton, TextField } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import type { ControlProps } from "@/components/core/DynamicForm";

interface TagPickerProps extends Partial<ControlProps> {
  /** The form field each chosen tag is submitted under, once per tag. */
  name: string;
  /** The known corpus: the only tags that can be added. */
  options: string[];
  /** Tags already on the product, kept even when the corpus no longer has them. */
  defaultValue?: string[];
}

export function TagPicker({
  name,
  options,
  defaultValue = [],
  ...controlProps
}: TagPickerProps) {
  const listId = useId();
  const [tags, setTags] = useState(defaultValue);
  const [draft, setDraft] = useState("");

  // ponytail: native <datalist> for suggestions; a combobox if the corpus
  // outgrows a browser's suggestion list.
  const remaining = options.filter((tag) => !tags.includes(tag));

  const add = (tag: string) => {
    setTags([...tags, tag]);
    setDraft("");
  };

  // Picking a suggestion replaces the input's text (browsers report it as a
  // replacement, or with no inputType at all) and adds the tag at once. Typed
  // or deleted text stays a draft until Enter, so passing through "climate" on
  // the way to "climate-change" doesn't add "climate".
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const { inputType } = e.nativeEvent as InputEvent;
    const picked = !inputType || inputType === "insertReplacementText";
    if (picked && remaining.includes(value)) {
      add(value);
    } else {
      setDraft(value);
    }
  };

  return (
    <Flex direction="column" gap="2">
      {tags.length > 0 && (
        <Flex gap="2" wrap="wrap">
          {tags.map((tag) => (
            <Badge key={tag} color="gray" size="2">
              {tag}
              <IconButton
                type="button"
                size="1"
                variant="ghost"
                color="gray"
                aria-label={`Remove ${tag}`}
                onClick={() => setTags(tags.filter((t) => t !== tag))}
              >
                <Cross2Icon />
              </IconButton>
              <input type="hidden" name={name} value={tag} />
            </Badge>
          ))}
        </Flex>
      )}
      <TextField.Root
        {...controlProps}
        list={listId}
        value={draft}
        onChange={handleChange}
        // Enter adds the draft if it names a tag, rather than submitting the form.
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const match = remaining.find(
            (tag) => tag.toLowerCase() === draft.trim().toLowerCase()
          );
          if (match) add(match);
        }}
        placeholder={remaining.length ? "Add a tag" : "No more tags to add"}
        disabled={!remaining.length}
      />
      <datalist id={listId}>
        {remaining.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </Flex>
  );
}
