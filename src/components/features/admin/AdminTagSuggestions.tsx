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
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { productUrl } from "@/lib/urls";

export interface TagSuggestion {
  tag: string;
  suggested_by?: string;
  suggested_at?: string;
  /** Products carrying the tag now, which a merge or rejection rewrites. */
  products: { account_id: string; product_id: string }[];
  /** The approved tags it looks most like, best first. */
  matches: { tag: string; score: number }[];
}

interface AdminTagSuggestionsProps {
  suggestions: TagSuggestion[];
  /** Approved tags with how many products carry each, any of which a suggestion can merge into. */
  approved: { tag: string; products: number }[];
  /** Applies a decision, resolving to why it was refused if it was. */
  action: (formData: FormData) => Promise<{ error?: string }>;
}

export function AdminTagSuggestions({
  suggestions,
  approved,
  action,
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
        />
      ))}
    </Flex>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function SuggestionCard({
  suggestion: { tag, suggested_by, suggested_at, products, matches },
  approved,
  action,
}: { suggestion: TagSuggestion } & Omit<AdminTagSuggestionsProps, "suggestions">) {
  // A merge rewrites other people's products, so choosing a target only
  // stages it; nothing changes until it is saved.
  const [into, setInto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  const decide = (decision: "approve" | "merge" | "reject") =>
    startTransition(async () => {
      const form = new FormData();
      form.set("tag", tag);
      form.set("decision", decision);
      if (decision === "merge" && into) form.set("into", into);
      setError((await action(form)).error ?? "");
    });

  const target = approved.find((t) => t.tag === into);

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex gap="2" align="center" wrap="wrap">
          <Badge color="amber" size="2">
            {tag}
          </Badge>
          {into && (
            <>
              <ArrowRightIcon aria-label="merges into" />
              <Badge color="gray" size="2">
                {into}
              </Badge>
            </>
          )}
          <Text size="1" color="gray">
            Suggested by {suggested_by ?? "unknown"}
            {suggested_at &&
              ` on ${new Date(suggested_at).toLocaleDateString("en-US", { dateStyle: "medium" })}`}
          </Text>
        </Flex>

        {into ? (
          <Text size="2">
            Saving replaces <b>{tag}</b> with <b>{into}</b> on{" "}
            <ProductLinks products={products} />, and removes the suggestion.
            {target && ` ${into} is already on ${plural(target.products, "product")}.`}
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
            {into ? "Merge into" : matches.length ? "Looks like" : "No close match"}
          </Text>
          {matches.map((m) => (
            <Button
              key={m.tag}
              type="button"
              size="1"
              variant={m.tag === into ? "solid" : "soft"}
              color="gray"
              aria-pressed={m.tag === into}
              onClick={() => setInto(m.tag)}
            >
              {m.tag}
            </Button>
          ))}
          {into && !matches.some((m) => m.tag === into) && (
            <Button type="button" size="1" variant="solid" color="gray" aria-pressed>
              {into}
            </Button>
          )}
          <MergeTargetPicker
            approved={approved}
            label={matches.length ? "Other…" : "Merge into…"}
            onChoose={setInto}
          />
        </Flex>

        <Flex gap="2" align="center" wrap="wrap">
          {into ? (
            <>
              <Button type="button" size="1" loading={busy} onClick={() => decide("merge")}>
                Save merge
              </Button>
              <Button
                type="button"
                size="1"
                variant="soft"
                color="gray"
                disabled={busy}
                onClick={() => {
                  setInto(null);
                  setError("");
                }}
              >
                Keep “{tag}”
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="1"
                variant={matches.length ? "soft" : "solid"}
                loading={busy}
                onClick={() => decide("approve")}
              >
                Approve as a new tag
              </Button>
              <Flex flexGrow="1" />
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
            </>
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
        <Button type="button" size="1" variant="ghost" color="gray">
          {label}
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
