"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Box, Flex, Kbd, Link, Text, TextField } from "@radix-ui/themes";
import { CheckIcon, MagnifyingGlassIcon, PlusIcon } from "@radix-ui/react-icons";

export interface TagMenuItem {
  tag: string;
  /** Shown at the row's right, such as how many products carry it. */
  detail?: string;
  /** The detail's colour, amber for a tag awaiting review as elsewhere. */
  detailColor?: "gray" | "amber";
  /** Checked, in a menu that picks several. */
  selected?: boolean;
  /** Chooses the row instead of `onChoose(tag)`, for a row that isn't one tag. */
  onChoose?: () => void;
}

export interface TagMenuSection {
  title: string;
  /** Said under the title, such as what the group's tags have in common. */
  description?: string;
  items: TagMenuItem[];
  /** A link in the group's heading, such as adding every row at once. */
  action?: { label: string; onChoose: () => void };
}

interface TagMenuProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  /**
   * The tags, in titled groups, each optionally described under its title;
   * an empty group is left out.
   */
  sections: TagMenuSection[];
  onChoose: (tag: string) => void;
  /** A last row that isn't a tag, such as suggesting a new one. */
  action?: { label: ReactNode; onChoose: () => void };
  /** Shown when no group has a tag and there is no action. */
  empty: string;
  /** Whether choosing toggles a tag, so rows carry a check column. */
  multiple?: boolean;
  /** Footer text beside the key hints. */
  hint?: string;
}

/**
 * A `<button>` inside a Radix `Link`, rid of the button's own chrome but
 * nothing more, so the link's type and colour still apply.
 */
export const LINK_BUTTON = { background: "none", border: 0, padding: 0, cursor: "pointer" } as const;

const ROW = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  height: 32,
  padding: "0 var(--space-3)",
  cursor: "pointer",
} as const;

/**
 * A filterable list of tags for inside a popover: a search field over
 * grouped rows, driven by the keyboard as much as the mouse. Arrow keys move
 * the highlight, Enter chooses, and the popover's own Esc closes it. Rows are
 * plain options rather than buttons, so they stay inside the list's edges.
 */
export function TagMenu({
  query,
  onQueryChange,
  placeholder,
  sections,
  onChoose,
  action,
  empty,
  multiple,
  hint,
}: TagMenuProps) {
  const id = useId();
  const groups = sections.filter((s) => s.items.length);
  const choices = [
    ...groups.flatMap((g) => g.items.map((item) => item.onChoose ?? (() => onChoose(item.tag)))),
    ...(action ? [action.onChoose] : []),
  ];
  const [active, setActive] = useState(0);
  const current = Math.min(active, choices.length - 1);
  const optionId = (i: number) => `${id}-${i}`;

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    document.getElementById(optionId(current))?.scrollIntoView?.({ block: "nearest" });
  });

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (step && choices.length) {
      e.preventDefault();
      setActive((current + step + choices.length) % choices.length);
    }
    // Enter would otherwise submit the form behind the popover.
    if (e.key === "Enter") {
      e.preventDefault();
      choices[current]?.();
    }
  };

  const row = (i: number, content: ReactNode, selected?: boolean) => (
    <div
      key={i}
      id={optionId(i)}
      role="option"
      aria-selected={multiple ? !!selected : i === current}
      onMouseMove={() => setActive(i)}
      onClick={choices[i]}
      style={{ ...ROW, background: i === current ? "var(--gray-a3)" : undefined }}
    >
      {content}
    </div>
  );

  let i = 0;
  return (
    <Flex direction="column">
      <Box p="2" style={{ borderBottom: "1px solid var(--gray-a5)" }}>
        <TextField.Root
          size="2"
          role="combobox"
          aria-expanded
          aria-controls={`${id}-list`}
          aria-activedescendant={choices.length ? optionId(current) : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon aria-hidden />
          </TextField.Slot>
        </TextField.Root>
      </Box>
      {/* ponytail: renders every tag; fine to a few hundred, virtualise the
          list if the corpus grows past that. */}
      <div
        id={`${id}-list`}
        role="listbox"
        aria-multiselectable={multiple || undefined}
        aria-label={placeholder}
        style={{ maxHeight: 300, overflowY: "auto", overflowX: "hidden", padding: "var(--space-1) 0" }}
      >
        {groups.map((group, g) => (
          <div
            key={group.title}
            role="group"
            aria-label={group.title}
            aria-describedby={group.description ? `${id}-group-${g}` : undefined}
          >
            <Flex
              justify="between"
              align="center"
              style={{ padding: "var(--space-2) var(--space-3) var(--space-1)" }}
            >
              <Text size="1" weight="medium" color="gray">
                {group.title}
              </Text>
              {group.action && (
                <Link size="1" weight="medium" asChild>
                  <button
                    type="button"
                    onClick={group.action.onChoose}
                    style={LINK_BUTTON}
                  >
                    {group.action.label}
                  </button>
                </Link>
              )}
            </Flex>
            {group.description && (
              <Text
                as="div"
                size="1"
                color="gray"
                id={`${id}-group-${g}`}
                style={{ padding: "0 var(--space-3) var(--space-1)" }}
              >
                {group.description}
              </Text>
            )}
            {group.items.map((item) =>
              row(
                i++,
                <>
                  {multiple && (
                    <CheckIcon
                      aria-hidden
                      style={{ flexShrink: 0, visibility: item.selected ? "visible" : "hidden" }}
                    />
                  )}
                  <Text size="2" truncate style={{ flex: 1 }}>
                    {item.tag}
                  </Text>
                  {item.detail && (
                    <Text
                      size="1"
                      color={item.detailColor ?? "gray"}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {item.detail}
                    </Text>
                  )}
                </>,
                item.selected
              )
            )}
          </div>
        ))}
        {action &&
          row(
            i++,
            <>
              <PlusIcon aria-hidden style={{ flexShrink: 0 }} />
              <Text size="2" truncate>
                {action.label}
              </Text>
            </>
          )}
        {!choices.length && (
          <Text as="div" size="2" color="gray" style={{ padding: "var(--space-2) var(--space-3)" }}>
            {empty}
          </Text>
        )}
      </div>
      <Flex
        gap="3"
        align="center"
        wrap="wrap"
        px="3"
        py="2"
        style={{ borderTop: "1px solid var(--gray-a5)" }}
      >
        <Text size="1" color="gray">
          <Kbd size="1">↑</Kbd> <Kbd size="1">↓</Kbd> move
        </Text>
        <Text size="1" color="gray">
          <Kbd size="1">Enter</Kbd> {multiple ? "toggle" : "choose"}
        </Text>
        {hint && (
          <Text size="1" color="gray" style={{ marginLeft: "auto" }}>
            {hint}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
