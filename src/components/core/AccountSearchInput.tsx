"use client";

import { useEffect, useId, useState } from "react";
import { TextField } from "@radix-ui/themes";
import { searchAccounts } from "@/lib/actions/account";
import type { ControlProps } from "./DynamicForm";

interface AccountSearchInputProps extends Partial<ControlProps> {
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

/**
 * Text input backed by a native `<datalist>`: the browser draws the suggestion
 * list and handles its keyboard navigation and accessibility, so we only fetch
 * the options. Suggestions are individual accounts whose handle or display name
 * matches what has been typed, and the submitted value is always the handle.
 *
 * ponytail: no combobox library, no custom popover. Where `<datalist>` is
 * unsupported this degrades to the plain text input it replaced.
 */
export function AccountSearchInput({
  name,
  required,
  placeholder,
  defaultValue = "",
  ...controlProps
}: AccountSearchInputProps) {
  const listId = useId();
  const [query, setQuery] = useState(defaultValue);
  const [matches, setMatches] = useState<
    Array<{ account_id: string; name: string }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      searchAccounts(query)
        .then((results) => {
          if (!cancelled) setMatches(results);
        })
        .catch(() => {
          if (!cancelled) setMatches([]);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <>
      <TextField.Root
        {...controlProps}
        type="text"
        name={name}
        size="3"
        list={listId}
        required={required}
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
      />
      <datalist id={listId}>
        {matches.map((match) => (
          <option key={match.account_id} value={match.account_id}>
            {match.name}
          </option>
        ))}
      </datalist>
    </>
  );
}
