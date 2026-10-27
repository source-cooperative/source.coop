import { Metadata } from "next";
import { Box } from "@radix-ui/themes";
import { FormTitle } from "@/components/core";
import { AdminTagSuggestions } from "@/components/features/admin/AdminTagSuggestions";
import { productsTable } from "@/lib/clients/database";
import { getPageSession } from "@/lib/api/utils";
import { reviewTag } from "@/lib/actions/tags";
import { listTags } from "@/lib/operations/tags";
import { similarTags } from "@/lib/tags/similar";

export const metadata: Metadata = {
  title: "Admin — Tags",
};

// Access is gated by the /admin layout.
export default async function AdminTagsPage() {
  const session = await getPageSession();
  const [pending, approved, tagged] = await Promise.all([
    listTags(session, { pending: "true" }),
    listTags(session, {}),
    productsTable.listTagged(),
  ]);
  if (!pending.ok) throw new Error(pending.message);
  if (!approved.ok) throw new Error(approved.message);

  // ponytail: one scan of every tagged product, grouped here; a per-tag count
  // on the tags table if the products table outgrows a page render.
  const carrying = (tag: string) =>
    tagged.filter((p) => p.metadata.tags!.includes(tag));
  const approvedTags = approved.value.items.map((t) => t.tag_id);

  return (
    <Box>
      <FormTitle
        title="Tags"
        description="Review tags people have suggested. Approving adds a tag to the list everyone picks from; merging replaces it with an approved tag on every product that carries it; rejecting takes it off them."
      />
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
        }))}
        approved={approvedTags.map((tag) => ({
          tag,
          products: carrying(tag).length,
        }))}
        action={reviewTag}
      />
    </Box>
  );
}
