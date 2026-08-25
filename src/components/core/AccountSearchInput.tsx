"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Avatar, Box, Spinner, TextField, Theme } from "@radix-ui/themes";
// The primitive rather than `Popover` from @radix-ui/themes: that wrapper's
// Anchor destructures `children` away and never renders them, so the field
// inside it disappears. Same package Themes builds its own Popover on, and the
// repo already depends on four other @radix-ui/react-* primitives directly.
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { searchAccounts } from "@/lib/actions/account";
import type { AccountSuggestion } from "@/lib/clients/database/accounts";
import { AccountIdentity, accountCardSurface } from "./AccountIdentity";
import type { ControlProps } from "./DynamicForm";

/** Below this, a search matches most of the table and tells you nothing. */
const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

interface AccountSearchInputProps extends Partial<ControlProps> {
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

/**
 * Account picker: type part of a handle or display name, choose from the
 * matches, and the handle is what gets submitted.
 *
 * Each suggestion is the same identity block the profile hover card shows, so
 * the person you pick from the list looks like the person you land on. That
 * rules out `<datalist>`, which can only render flat strings — hence the
 * listbox below, kept to the ARIA combobox pattern: the input owns
 * `aria-activedescendant` and focus never leaves it.
 */
export function AccountSearchInput({
  name,
  required,
  placeholder,
  defaultValue = "",
  ...controlProps
}: AccountSearchInputProps) {
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  const [query, setQuery] = useState(defaultValue);
  const [matches, setMatches] = useState<AccountSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Choosing a suggestion writes the handle into the input, which would
  // otherwise read as typing and fire a fresh search for the thing just picked.
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      setLoading(false);
      return;
    }

    if (query.trim().length < MIN_QUERY) {
      setMatches([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    // Set before the debounce rather than around the request alone: the wait is
    // part of what the reader is waiting through.
    setLoading(true);

    let cancelled = false;
    const timer = setTimeout(() => {
      searchAccounts(query)
        .then((results) => {
          if (cancelled) return;
          setMatches(results);
          setActiveIndex(-1);
          setOpen(results.length > 0);
        })
        .catch(() => {
          if (!cancelled) setMatches([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function select(match: AccountSuggestion) {
    skipNextSearch.current = true;
    setQuery(match.account_id);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open && matches.length > 0) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && activeIndex >= 0) {
      // Only swallow Enter when it is being used to choose; otherwise it must
      // still submit the form.
      event.preventDefault();
      select(matches[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor>
        <TextField.Root
          {...controlProps}
          type="text"
          name={name}
          size="3"
          required={required}
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          // The spinner is decorative; this is what tells a screen reader the
          // suggestions are still being fetched.
          aria-busy={loading}
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
        >
          {/* Always mounted so the text does not shift when the spinner
              appears. */}
          <TextField.Slot side="right">
            <Spinner loading={loading} />
          </TextField.Slot>
        </TextField.Root>
      </PopoverPrimitive.Anchor>

      {/* Portalled, which is the whole reason for the Popover: positioned
          absolutely inside the field, the list was clipped by the scroll box of
          any dialog the form sat in -- and the invite form is a dialog.
          <Theme asChild> because a portal renders outside the theme's element,
          so without it none of the CSS variables below resolve. */}
      <PopoverPrimitive.Portal>
        <Theme asChild>
          <PopoverPrimitive.Content
            id={listId}
            role="listbox"
            aria-label="Matching accounts"
            side="bottom"
            align="start"
            sideOffset={4}
            // Focus has to stay on the input: it is the combobox, and it is
            // what carries aria-activedescendant. Radix would otherwise move
            // focus here on open and back to the anchor on close.
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            style={{
              ...accountCardSurface,
              width: "var(--radix-popover-trigger-width)",
              maxHeight: "18rem",
              overflowY: "auto",
              padding: "var(--space-1)",
            }}
          >
        {matches.map((match, index) => (
          <Box
            key={match.account_id}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            px="3"
            py="2"
            // Pointer, not click: click lands after blur has already closed
            // the list, so the selection would never register.
            onMouseDown={(event) => {
              event.preventDefault();
              select(match);
            }}
            onMouseEnter={() => setActiveIndex(index)}
            style={{
              cursor: "pointer",
              backgroundColor:
                index === activeIndex ? "var(--gray-4)" : undefined,
            }}
          >
            <AccountIdentity
              name={match.name}
              accountId={match.account_id}
              size="2"
              avatar={
                <Avatar
                  size="2"
                  radius="full"
                  src={match.profile_image}
                  fallback={(match.name || match.account_id)[0].toUpperCase()}
                />
              }
            />
          </Box>
        ))}
          </PopoverPrimitive.Content>
        </Theme>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
