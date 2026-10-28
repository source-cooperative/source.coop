"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, Button, Flex, Popover, Table, Text, TextField } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { productListUrl } from "@/lib/urls";
import { canonTag } from "@/lib/tags/canon";
import { AccountMention, type AccountsById } from "@/components/core/AccountMention";
import { TagMenu } from "@/components/features/products/TagMenu";

export interface ApprovedTag {
  tag: string;
  /** How many products carry it. */
  products: number;
  suggested_by?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });

/** Where an approved tag came from, in words, its people linked. */
function Provenance({
  tag: { suggested_by, reviewed_by, reviewed_at },
  accounts,
}: {
  tag: ApprovedTag;
  accounts?: AccountsById;
}) {
  if (!suggested_by && !reviewed_by) return <>Initial import</>;
  return (
    <>
      {suggested_by && (
        <>
          Suggested by <AccountMention id={suggested_by} accounts={accounts} />
        </>
      )}
      {suggested_by && reviewed_by && ", "}
      {reviewed_by && (
        <>
          {suggested_by ? "approved" : "Approved"} by{" "}
          <AccountMention id={reviewed_by} accounts={accounts} />
        </>
      )}
      {reviewed_at && ` on ${date(reviewed_at)}`}
    </>
  );
}

/**
 * Every approved tag, most used first, with where each one came from, and a
 * way to replace one on every product: merge it into other tags, rename it,
 * or remove it.
 */
export function AdminTagList({
  tags,
  action,
  accounts,
}: {
  tags: ApprovedTag[];
  /** Applies a decision, resolving to why it was refused if it was. */
  action: (formData: FormData) => Promise<{ error?: string }>;
  /** The suggesters' and approvers' accounts, for their cards on hover. */
  accounts?: AccountsById;
}) {
  const [filter, setFilter] = useState("");
  const query = filter.trim().toLowerCase();
  const shown = tags
    .filter((t) => t.tag.includes(query))
    .sort((a, b) => b.products - a.products || a.tag.localeCompare(b.tag));

  return (
    <Flex direction="column" gap="3">
      <TextField.Root
        id="admin-tag-filter"
        size="2"
        placeholder={`Filter ${tags.length} tags`}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ maxWidth: 280 }}
      />
      {shown.length ? (
        <Table.Root size="1">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Tag</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">Products</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Added</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {shown.map((t) => (
              <Table.Row key={t.tag}>
                <Table.RowHeaderCell>
                  <Link href={`${productListUrl()}?tags=${encodeURIComponent(t.tag)}`}>
                    {t.tag}
                  </Link>
                </Table.RowHeaderCell>
                <Table.Cell justify="end" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {t.products}
                </Table.Cell>
                <Table.Cell>
                  <Text color="gray">
                    <Provenance tag={t} accounts={accounts} />
                  </Text>
                </Table.Cell>
                <Table.Cell justify="end">
                  <ChangeTag tag={t} tags={tags} action={action} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      ) : (
        <Text size="2" color="gray">
          {tags.length ? `No tag matches “${filter}”.` : "No tags have been approved yet."}
        </Text>
      )}
    </Flex>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Replaces an approved tag on every product that carries it: with the tags
 * chosen, a new spelling among them renaming it, or with nothing, removing it.
 */
function ChangeTag({
  tag,
  tags,
  action,
}: {
  tag: ApprovedTag;
  tags: ApprovedTag[];
  action: (formData: FormData) => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [into, setInto] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  const query = canonTag(filter);
  const others = tags.filter((t) => t.tag !== tag.tag && !into.includes(t.tag));
  const shown = others.filter((t) => t.tag.includes(query));
  const isNew = !!query && query !== tag.tag && !tags.some((t) => t.tag === query) && !into.includes(query);
  const add = (t: string) => {
    setInto((into) => [...into, t]);
    setFilter("");
  };
  const save = (decision: "merge" | "reject") =>
    startTransition(async () => {
      const form = new FormData();
      form.set("tag", tag.tag);
      form.set("decision", decision);
      form.set("approved", "true");
      if (decision === "merge") into.forEach((t) => form.append("into", t));
      const { error = "" } = await action(form);
      setError(error);
      if (!error) setOpen(false);
    });

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setInto([]);
        setFilter("");
        setError("");
      }}
    >
      <Popover.Trigger>
        <Button type="button" size="1" variant="ghost" color="gray">
          Change
        </Button>
      </Popover.Trigger>
      <Popover.Content width="320px" aria-label={`Change ${tag.tag}`} style={{ padding: 0 }}>
        <Flex direction="column" gap="2" p="3">
          <Text size="2">
            Replace <b>{tag.tag}</b> on {plural(tag.products, "product")} with:
          </Text>
          {into.length > 0 && (
            <Flex gap="1" wrap="wrap">
              {into.map((t) => (
                <Badge key={t} size="2" color="gray">
                  {t}
                  {!tags.some((x) => x.tag === t) && " (new)"}
                  <button
                    type="button"
                    aria-label={`Take off ${t}`}
                    onClick={() => setInto((into) => into.filter((x) => x !== t))}
                    style={{ all: "unset", cursor: "pointer", display: "inline-flex" }}
                  >
                    <Cross2Icon />
                  </button>
                </Badge>
              ))}
            </Flex>
          )}
        </Flex>
        <div style={{ borderTop: "1px solid var(--gray-a5)" }}>
          <TagMenu
            query={filter}
            onQueryChange={setFilter}
            placeholder="Find a tag, or type a new name"
            sections={[
              {
                title: query ? `Matching “${query}”` : "All tags",
                items: shown.map((t) => ({ tag: t.tag, detail: plural(t.products, "product") })),
              },
            ]}
            onChoose={add}
            action={
              isNew
                ? {
                    label: into.length ? `Add new tag “${query}”` : `Rename to “${query}”`,
                    onChoose: () => add(query),
                  }
                : undefined
            }
            empty={`No other tag matches “${filter}”.`}
          />
        </div>
        <Flex direction="column" gap="2" p="3" style={{ borderTop: "1px solid var(--gray-a5)" }}>
          <Flex gap="2" align="center">
            <Button
              type="button"
              size="1"
              disabled={!into.length}
              loading={busy}
              onClick={() => save("merge")}
            >
              Save
            </Button>
            <Flex flexGrow="1" />
            <Button
              type="button"
              size="1"
              variant="ghost"
              color="red"
              disabled={busy || into.length > 0}
              onClick={() => save("reject")}
            >
              Remove from {plural(tag.products, "product")}
            </Button>
          </Flex>
          {error && (
            <Text size="1" color="red" role="alert">
              {error}
            </Text>
          )}
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}
