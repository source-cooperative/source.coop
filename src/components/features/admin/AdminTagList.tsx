"use client";

import Link from "next/link";
import { useState } from "react";
import { Flex, Table, Text, TextField } from "@radix-ui/themes";
import { productListUrl } from "@/lib/urls";
import { AccountMention, type AccountsById } from "@/components/core/AccountMention";

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

/** Every approved tag, most used first, with where each one came from. */
export function AdminTagList({
  tags,
  accounts,
}: {
  tags: ApprovedTag[];
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
