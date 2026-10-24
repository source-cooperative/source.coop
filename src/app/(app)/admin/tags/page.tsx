import { Metadata } from "next";
import { Box } from "@radix-ui/themes";
import { FormTitle } from "@/components/core";
import { AdminTagSuggestions } from "@/components/features/admin/AdminTagSuggestions";
import { productsTable, tagsTable } from "@/lib/clients/database";
import { reviewTag } from "@/lib/actions/tags";

export const metadata: Metadata = {
  title: "Admin — Tags",
};

// Access is gated by the /admin layout.
export default async function AdminTagsPage() {
  const tags = await tagsTable.listAll();
  // ponytail: one products scan per pending tag; fine while the queue is short.
  const suggestions = await Promise.all(
    tags
      .filter((t) => t.pending)
      .map(async (t) => ({
        tag: t.tag_id,
        suggested_by: t.suggested_by,
        suggested_at: t.suggested_at,
        products: (await productsTable.listByTag(t.tag_id)).map(
          ({ account_id, product_id }) => ({ account_id, product_id })
        ),
      }))
  );

  return (
    <Box>
      <FormTitle
        title="Tags"
        description="Review tags people have suggested. Approving adds a tag to the list everyone picks from; merging or rejecting rewrites the products that carry it."
      />
      <AdminTagSuggestions
        suggestions={suggestions}
        approved={tags.filter((t) => !t.pending).map((t) => t.tag_id)}
        action={reviewTag}
      />
    </Box>
  );
}
