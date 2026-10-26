import { Metadata } from "next";
import { Box } from "@radix-ui/themes";
import { FormTitle } from "@/components/core";
import { AdminTagSuggestions } from "@/components/features/admin/AdminTagSuggestions";
import { productsTable } from "@/lib/clients/database";
import { getPageSession } from "@/lib/api/utils";
import { reviewTag } from "@/lib/actions/tags";
import { listTags } from "@/lib/operations/tags";

export const metadata: Metadata = {
  title: "Admin — Tags",
};

// Access is gated by the /admin layout.
export default async function AdminTagsPage() {
  const session = await getPageSession();
  const [pending, approved] = await Promise.all([
    listTags(session, { pending: "true" }),
    listTags(session, {}),
  ]);
  if (!pending.ok) throw new Error(pending.message);
  if (!approved.ok) throw new Error(approved.message);
  // ponytail: one products scan per pending tag; fine while the queue is short.
  const suggestions = await Promise.all(
    pending.value.items.map(async (t) => ({
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
        approved={approved.value.items.map((t) => t.tag_id)}
        action={reviewTag}
      />
    </Box>
  );
}
