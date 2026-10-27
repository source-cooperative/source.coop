"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Flex, Table, Text } from "@radix-ui/themes";

export interface ReviewedTag {
  tag: string;
  outcome: "approved" | "merged" | "rejected";
  reviewed_by?: string;
  reviewed_at?: string;
  suggested_by?: string;
  /** The approved tags a merged tag was replaced with. */
  merged_into?: string[];
  /** How many products a merge or rejection rewrote, and undoing it restores. */
  products: number;
}

interface AdminReviewedTagsProps {
  reviewed: ReviewedTag[];
  /** Applies a decision, resolving to why it was refused if it was. */
  action: (formData: FormData) => Promise<{ error?: string }>;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });

/** What the decision was, in words. */
function outcome({ outcome, merged_into, products }: ReviewedTag) {
  if (outcome === "approved") return "Approved";
  const on = products ? ` on ${plural(products, "product")}` : "";
  return outcome === "merged"
    ? `Merged into ${(merged_into ?? []).join(" + ")}${on}`
    : `Rejected${on ? `, taken off ${plural(products, "product")}` : ""}`;
}

/**
 * Suggested tags an admin has decided, most recent first, with the decision
 * and who made it. Undo puts a tag back awaiting review, and reverses what a
 * merge or rejection did to products.
 */
export function AdminReviewedTags({ reviewed, action }: AdminReviewedTagsProps) {
  if (!reviewed.length) {
    return (
      <Text size="2" color="gray">
        No suggested tags have been reviewed yet.
      </Text>
    );
  }
  return (
    <Table.Root size="1">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Tag</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Decision</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Reviewed</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {reviewed.map((tag) => (
          <ReviewedRow key={tag.tag} tag={tag} action={action} />
        ))}
      </Table.Body>
    </Table.Root>
  );
}

const COLORS = { approved: "green", merged: "blue", rejected: "gray" } as const;

function ReviewedRow({
  tag,
  action,
}: {
  tag: ReviewedTag;
  action: AdminReviewedTagsProps["action"];
}) {
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const undo = () =>
    startTransition(async () => {
      const form = new FormData();
      form.set("tag", tag.tag);
      form.set("decision", "undo");
      setError((await action(form)).error ?? "");
    });

  return (
    <Table.Row>
      <Table.RowHeaderCell>
        <Badge color={COLORS[tag.outcome]} size="2">
          {tag.tag}
        </Badge>
      </Table.RowHeaderCell>
      <Table.Cell>
        <Text size="2">{outcome(tag)}</Text>
        {tag.suggested_by && (
          <Text as="div" size="1" color="gray">
            Suggested by {tag.suggested_by}
          </Text>
        )}
      </Table.Cell>
      <Table.Cell>
        <Text size="2" color="gray">
          {tag.reviewed_by ?? "unknown"}
          {tag.reviewed_at && ` on ${date(tag.reviewed_at)}`}
        </Text>
      </Table.Cell>
      <Table.Cell justify="end">
        <Flex direction="column" align="end" gap="1">
          <Button
            type="button"
            size="1"
            variant="soft"
            color="gray"
            loading={busy}
            onClick={undo}
            title="Put this tag back awaiting review, and reverse what the decision did to products"
          >
            Undo
          </Button>
          {error && (
            <Text size="1" color="red" role="alert">
              {error}
            </Text>
          )}
        </Flex>
      </Table.Cell>
    </Table.Row>
  );
}
