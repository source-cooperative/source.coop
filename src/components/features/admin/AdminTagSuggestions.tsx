"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  Popover,
  Text,
  TextField,
} from "@radix-ui/themes";
import { ArrowRightIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { productUrl } from "@/lib/urls";
import { AccountMention, type AccountsById } from "@/components/core/AccountMention";

export interface TagSuggestion {
  tag: string;
  suggested_by?: string;
  suggested_at?: string;
  /** Products carrying the tag now, which a merge or rejection rewrites. */
  products: { account_id: string; product_id: string }[];
  /** The approved tags it looks most like, best first. */
  matches: { tag: string; score: number }[];
  /**
   * The approved tags it splits into when each of its words is one, as
   * `field-boundaries` is `field` and `boundaries`, offered as one merge.
   */
  split?: string[] | null;
}

interface AdminTagSuggestionsProps {
  suggestions: TagSuggestion[];
  /** Approved tags with how many products carry each, any of which a suggestion can merge into. */
  approved: { tag: string; products: number }[];
  /** Applies a decision, resolving to why it was refused if it was. */
  action: (formData: FormData) => Promise<{ error?: string }>;
  /** The suggesters' accounts, for their cards on hover. */
  accounts?: AccountsById;
}

export function AdminTagSuggestions({
  suggestions,
  approved,
  action,
  accounts,
}: AdminTagSuggestionsProps) {
  if (!suggestions.length) {
    return (
      <Text size="2" color="gray">
        No tags are waiting for review.
      </Text>
    );
  }
  return (
    <Flex direction="column" gap="3">
      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.tag}
          suggestion={suggestion}
          approved={approved}
          action={action}
          accounts={accounts}
        />
      ))}
    </Flex>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function SuggestionCard({
  suggestion: { tag, suggested_by, suggested_at, products, matches, split },
  approved,
  action,
  accounts,
}: { suggestion: TagSuggestion } & Omit<AdminTagSuggestionsProps, "suggestions">) {
  // A merge rewrites other people's products, so choosing targets only stages
  // them; nothing changes until the merge is saved.
  const [into, setInto] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  const toggle = (target: string) =>
    setInto((into) =>
      into.includes(target) ? into.filter((t) => t !== target) : [...into, target]
    );
  const reset = () => {
    setInto([]);
    setError("");
  };
  const decide = (decision: "approve" | "merge" | "reject") =>
    startTransition(async () => {
      const form = new FormData();
      form.set("tag", tag);
      form.set("decision", decision);
      if (decision === "merge") into.forEach((target) => form.append("into", target));
      setError((await action(form)).error ?? "");
    });

  const isSplit =
    !!split && split.length === into.length && split.every((t) => into.includes(t));
  // Targets staged from the picker, shown so they can be taken off again.
  const extra = into.filter((t) => !matches.some((m) => m.tag === t));
  const target = into.length === 1 && approved.find((t) => t.tag === into[0]);

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex gap="2" align="center" wrap="wrap">
          <Badge color="amber" size="2">
            {tag}
          </Badge>
          {into.length > 0 && (
            <>
              <ArrowRightIcon aria-label="merges into" />
              {into.map((t) => (
                <Badge key={t} color="gray" size="2">
                  {t}
                </Badge>
              ))}
            </>
          )}
          <Text size="1" color="gray">
            Suggested by{" "}
            {suggested_by ? <AccountMention id={suggested_by} accounts={accounts} /> : "unknown"}
            {suggested_at &&
              ` on ${new Date(suggested_at).toLocaleDateString("en-US", { dateStyle: "medium" })}`}
          </Text>
        </Flex>

        {into.length ? (
          <Text size="2">
            Saving replaces <b>{tag}</b> with {andList(into)} on{" "}
            <ProductLinks products={products} />, and removes the suggestion.
            {target && ` ${target.tag} is already on ${plural(target.products, "product")}.`}
          </Text>
        ) : (
          <Text size="2" color="gray">
            {products.length ? (
              <>
                On <ProductLinks products={products} />
              </>
            ) : (
              "Not on any product."
            )}
          </Text>
        )}

        <Flex gap="2" align="center" wrap="wrap">
          <Text size="1" color="gray">
            {into.length
              ? "Merge into"
              : split || matches.length
                ? "Looks like"
                : "No close match"}
          </Text>
          {split && (
            <Button
              type="button"
              size="1"
              variant={isSplit ? "solid" : "soft"}
              color="gray"
              aria-pressed={isSplit}
              title={`Merge into ${andText(split)}`}
              onClick={() => (isSplit ? setInto([]) : setInto(split))}
            >
              {split.join(" + ")}
            </Button>
          )}
          {[...matches.map((m) => m.tag), ...extra].map((t) => (
            <Button
              key={t}
              type="button"
              size="1"
              variant={into.includes(t) ? "solid" : "soft"}
              color="gray"
              aria-pressed={into.includes(t)}
              onClick={() => toggle(t)}
            >
              {t}
            </Button>
          ))}
          <MergeTargetPicker
            approved={approved.filter((t) => !into.includes(t.tag))}
            label={into.length || matches.length || split ? "Other tag" : "Merge into a tag"}
            onChoose={(t) => setInto((into) => [...into, t])}
          />
        </Flex>

        <Flex gap="2" align="center" wrap="wrap">
          {into.length ? (
            <Button type="button" size="1" loading={busy} onClick={() => decide("merge")}>
              Save merge
            </Button>
          ) : (
            <Button
              type="button"
              size="1"
              // Soft on every card, so Save merge is the one solid button.
              variant="soft"
              loading={busy}
              onClick={() => decide("approve")}
            >
              Approve as a new tag
            </Button>
          )}
          <Flex flexGrow="1" />
          {into.length ? (
            // Undoes the staged merge, not the suggestion, so a warning colour
            // rather than Reject's red.
            <Button
              type="button"
              size="1"
              variant="ghost"
              color="orange"
              disabled={busy}
              onClick={reset}
            >
              Reset
            </Button>
          ) : (
            <Button
              type="button"
              size="1"
              variant="ghost"
              color="red"
              disabled={busy}
              onClick={() => decide("reject")}
            >
              Reject
            </Button>
          )}
        </Flex>

        {error && (
          <Text size="1" color="red" role="alert">
            {error}
          </Text>
        )}
      </Flex>
    </Card>
  );
}

/** "a", "a and b", or "a, b and c", for a sentence. */
const andText = (tags: string[]) =>
  tags.length > 1 ? `${tags.slice(0, -1).join(", ")} and ${tags.at(-1)}` : tags[0];

/** andText, with each tag in bold. */
function andList(tags: string[]) {
  return tags.map((t, i) => (
    <span key={t}>
      {i > 0 && (i === tags.length - 1 ? " and " : ", ")}
      <b>{t}</b>
    </span>
  ));
}

function ProductLinks({ products }: { products: TagSuggestion["products"] }) {
  if (!products.length) return <>no products</>;
  return (
    <>
      {products.map((p, i) => (
        <span key={`${p.account_id}/${p.product_id}`}>
          {i > 0 && ", "}
          <Link href={productUrl(p.account_id, p.product_id)}>
            {p.account_id}/{p.product_id}
          </Link>
        </span>
      ))}
    </>
  );
}

/** Every approved tag, filterable, for a merge target the matches missed. */
function MergeTargetPicker({
  approved,
  label,
  onChoose,
}: {
  approved: AdminTagSuggestionsProps["approved"];
  label: string;
  onChoose: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const query = filter.trim().toLowerCase();
  const shown = approved.filter((t) => t.tag.includes(query));
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setFilter("");
      }}
    >
      <Popover.Trigger>
        {/* Outlined with a chevron, so it reads as a control that opens a
            list, apart from the suggested tags beside it. */}
        <Button type="button" size="1" variant="outline" color="gray">
          {label}
          <ChevronDownIcon />
        </Button>
      </Popover.Trigger>
      <Popover.Content width="280px" aria-label="Choose a tag to merge into">
        <Flex direction="column" gap="2">
          <TextField.Root
            size="2"
            placeholder="Find an approved tag"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Text size="1" color="gray">
            Nothing changes until you save.
          </Text>
          {/* ponytail: renders every approved tag; fine to a few hundred. */}
          <Flex direction="column" style={{ maxHeight: 240, overflowY: "auto" }}>
            {shown.map((t) => (
              <Button
                key={t.tag}
                type="button"
                size="2"
                variant="ghost"
                color="gray"
                style={{ justifyContent: "space-between" }}
                onClick={() => {
                  onChoose(t.tag);
                  setOpen(false);
                }}
              >
                <span>{t.tag}</span>
                <Text size="1" color="gray">
                  {plural(t.products, "product")}
                </Text>
              </Button>
            ))}
            {!shown.length && (
              <Text size="2" color="gray">
                No approved tag matches “{filter}”.
              </Text>
            )}
          </Flex>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}
