import { Metadata } from "next";
import { Flex, Heading } from "@radix-ui/themes";
import { FormTitle } from "@/components/core";
import { AdminReviewedTags } from "@/components/features/admin/AdminReviewedTags";
import { AdminTagList } from "@/components/features/admin/AdminTagList";
import { AdminTagSuggestions } from "@/components/features/admin/AdminTagSuggestions";
import { productsTable } from "@/lib/clients/database";
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
  const carrying = (tag: string) =>
    tagged.filter((p) => p.metadata.tags!.includes(tag));
  const approvedTags = approved.value.items.map((t) => t.tag_id);
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
        description="Review tags people have suggested. Approving adds a tag to the list everyone picks from; merging replaces it with an approved tag on every product that carries it; rejecting takes it off them."
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
            products: t.changed?.length ?? carrying(t.tag_id).length,
          }))}
          action={reviewTag}
        />
      </Flex>
      <Flex direction="column" gap="3">
        <Heading size="4">All tags</Heading>
        <AdminTagList tags={counted} />
      </Flex>
    </Flex>
  );
}
