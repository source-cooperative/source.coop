import { Metadata } from "next";
import { Flex, Heading } from "@radix-ui/themes";
import { FormTitle } from "@/components/core";
import { AdminReviewedTags } from "@/components/features/admin/AdminReviewedTags";
import { AdminTagList } from "@/components/features/admin/AdminTagList";
import { AdminTagSuggestions } from "@/components/features/admin/AdminTagSuggestions";
import { accountsTable, productsTable } from "@/lib/clients/database";
import { publicView } from "@/lib/operations/accounts";
import { getPageSession } from "@/lib/api/utils";
import { reviewTag } from "@/lib/actions/tags";
import { listTags } from "@/lib/operations/tags";
import { similarTags, splitTag } from "@/lib/tags/similar";

export const metadata: Metadata = {
  title: "Admin — Tags",
};

// Access is gated by the /admin layout.
export default async function AdminTagsPage() {
  const session = await getPageSession();
  const [pending, approved, reviewed, tagged] = await Promise.all([
    listTags(session, { pending: "true" }),
    listTags(session, {}),
    listTags(session, { reviewed: "true" }),
    productsTable.listTagged(),
  ]);
  if (!pending.ok) throw new Error(pending.message);
  if (!approved.ok) throw new Error(approved.message);
  if (!reviewed.ok) throw new Error(reviewed.message);

  // ponytail: one scan of every tagged product, grouped here; a per-tag count
  // on the tags table if the products table outgrows a page render.
  const byTag = new Map<string, typeof tagged>();
  for (const p of tagged) {
    for (const t of p.metadata.tags!) {
      if (!byTag.has(t)) byTag.set(t, []);
      byTag.get(t)!.push(p);
    }
  }
  const carrying = (tag: string) => byTag.get(tag) ?? [];
  // Everyone named on the page, for their account cards on hover; public
  // views only, since they go to the browser.
  const named = [...pending.value.items, ...approved.value.items, ...reviewed.value.items]
    .flatMap((t) => [t.suggested_by, t.reviewed_by])
    .filter((id): id is string => !!id);
  const accounts = Object.fromEntries(
    (await accountsTable.fetchManyByIds([...new Set(named)])).map((a) => [
      a.account_id,
      publicView(a),
    ])
  );
  const approvedTags = approved.value.items.map((t) => t.tag_id);
  const taken = Object.fromEntries([
    ...pending.value.items.map((t) => [t.tag_id, "awaiting review"]),
    ...reviewed.value.items
      .filter((t) => t.outcome === "merged" || t.outcome === "rejected")
      .map((t) => [t.tag_id, t.outcome]),
  ]);
  const counted = approved.value.items.map((t) => ({
    tag: t.tag_id,
    products: carrying(t.tag_id).length,
    suggested_by: t.suggested_by,
    reviewed_by: t.reviewed_by,
    reviewed_at: t.reviewed_at,
  }));

  return (
    <Flex direction="column" gap="6">
      <FormTitle
        title="Tags"
        description="Review tags people have suggested, and change approved ones. Approving adds a tag, in the category you choose, to the list everyone picks from; merging replaces a tag with others on every product that carries it, and a new name renames it; rejecting or removing takes it off them. Every decision can be undone."
      />
      <Flex direction="column" gap="3">
        <Heading size="4">
          Awaiting review ({pending.value.items.length})
        </Heading>
        <AdminTagSuggestions
          suggestions={pending.value.items.map((t) => ({
            tag: t.tag_id,
            suggested_by: t.suggested_by,
            suggested_at: t.suggested_at,
            products: carrying(t.tag_id).map(({ account_id, product_id }) => ({
              account_id,
              product_id,
            })),
            matches: similarTags(t.tag_id, approvedTags),
            split: splitTag(t.tag_id, approvedTags),
          }))}
          approved={counted}
          action={reviewTag}
          accounts={accounts}
        />
      </Flex>
      <Flex direction="column" gap="3">
        <Heading size="4">Reviewed ({reviewed.value.items.length})</Heading>
        <AdminReviewedTags
          reviewed={reviewed.value.items.map((t) => ({
            tag: t.tag_id,
            outcome: t.outcome!,
            reviewed_by: t.reviewed_by,
            reviewed_at: t.reviewed_at,
            suggested_by: t.suggested_by,
            merged_into: t.merged_into,
            wasListed: !!t.previous,
            products: (t.changed ?? carrying(t.tag_id)).map(({ account_id, product_id }) => ({
              account_id,
              product_id,
            })),
          }))}
          action={reviewTag}
          accounts={accounts}
        />
      </Flex>
      <Flex direction="column" gap="3">
        <Heading size="4">All tags</Heading>
        <AdminTagList tags={counted} taken={taken} action={reviewTag} accounts={accounts} />
      </Flex>
    </Flex>
  );
}
