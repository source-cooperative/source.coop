"use client";

import { useState } from "react";
import { Flex, Table, Text, TextField } from "@radix-ui/themes";

export interface ApprovedTag {
  tag: string;
  /** How many products carry it. */
  products: number;
  suggested_by?: string;
  approved_by?: string;
  approved_at?: string;
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });

/** Where an approved tag came from, in words. */
function provenance({ suggested_by, approved_by, approved_at }: ApprovedTag) {
  if (!suggested_by && !approved_by) return "From the original cleanup";
  const parts = [
    suggested_by && `Suggested by ${suggested_by}`,
    approved_by && `approved by ${approved_by}`,
    approved_at && `on ${date(approved_at)}`,
  ].filter(Boolean);
  const text = parts.join(", ").replace(/, on /, " on ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Every approved tag, most used first, with where each one came from. */
export function AdminTagList({ tags }: { tags: ApprovedTag[] }) {
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
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {shown.map((t) => (
              <Table.Row key={t.tag}>
                <Table.RowHeaderCell>{t.tag}</Table.RowHeaderCell>
                <Table.Cell justify="end" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {t.products}
                </Table.Cell>
                <Table.Cell>
                  <Text color="gray">{provenance(t)}</Text>
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
