import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { UserSession } from "@/types";
import { isAdmin } from "@/lib/api/authz";
import { productsTable, tagsTable } from "@/lib/clients/database";
import { TAG_CATEGORY_IDS } from "@/lib/tags/categories";
import { adminTagsUrl } from "@/lib/urls";
import {
  deny,
  fromZodError,
  invalid,
  ok,
  onePage,
  OperationResult,
  type Page,
  pageSchema,
  unauthenticated,
} from "./result";

const MAX_PENDING_PER_USER = 5;
const TAG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const TagSchema = z
  .object({
    tag: z.string().openapi({ description: "The tag, as products carry it." }),
    category: z
      .enum(TAG_CATEGORY_IDS)
      .openapi({ description: "The group the tag belongs to." }),
  })
  .openapi("Tag");

export const TagPageSchema = pageSchema("TagPage", TagSchema);

/** Every approved tag with its category, the list products pick from. */
export async function listTags(): Promise<OperationResult<Page<z.infer<typeof TagSchema>>>> {
  const tags = await tagsTable.listAll();
  return ok(
    onePage(
      tags.flatMap((t) =>
        !t.pending && t.category ? [{ tag: t.tag_id, category: t.category }] : []
      )
    )
  );
}

/**
 * Suggests a tag that isn't in the corpus yet. Spaces become hyphens. The tag
 * is added as pending, which lets products carry it until an admin reviews
 * it. Suggesting a tag that already exists, pending or not, just returns it.
 */
export async function suggestTag(
  session: UserSession | null,
  raw: string
): Promise<OperationResult<{ tag: string }>> {
  const account_id = session?.account?.account_id;
  if (!account_id) return unauthenticated();

  const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (tag.length > 40 || !TAG_PATTERN.test(tag)) {
    return invalid(
      "Use up to 40 lowercase letters, digits and single hyphens, starting and ending with a letter or digit.",
      "tag"
    );
  }

  const tags = await tagsTable.listAll();
  if (tags.some((t) => t.tag_id === tag)) return ok({ tag });
  const pending = tags.filter((t) => t.pending && t.suggested_by === account_id);
  if (pending.length >= MAX_PENDING_PER_USER) {
    return invalid(
      `You have ${pending.length} tags awaiting review. Suggest more once they've been reviewed.`,
      "tag"
    );
  }

  await tagsTable.suggest(tag, account_id);
  return ok({ tag });
}

export const ReviewTagSchema = z.discriminatedUnion("decision", [
  z.object({
    tag: z.string().min(1),
    decision: z.literal("approve"),
    category: z.enum(TAG_CATEGORY_IDS, {
      errorMap: () => ({ message: "Choose a category to approve the tag into" }),
    }),
  }),
  z.object({
    tag: z.string().min(1),
    decision: z.literal("merge"),
    into: z.string().min(1, "Choose a tag to merge into"),
  }),
  z.object({ tag: z.string().min(1), decision: z.literal("reject") }),
]);

/**
 * An admin's decision on a pending tag: approve it into a category, merge it
 * into an approved tag on every product that carries it, or reject it and
 * take it off those products.
 */
export async function reviewTag(
  session: UserSession | null,
  input: unknown
): Promise<OperationResult<null>> {
  if (!isAdmin(session)) return deny(session, "Only admins may review tags");
  const parsed = ReviewTagSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const review = parsed.data;

  if (review.decision === "approve") {
    await tagsTable.approve(review.tag, review.category);
  } else {
    const into = review.decision === "merge" ? review.into : undefined;
    if (into) {
      const corpus = await tagsTable.listAll();
      if (!corpus.some((t) => t.tag_id === into && !t.pending)) {
        return invalid(`Can't merge into "${into}": it isn't an approved tag`, "into");
      }
    }
    for (const product of await productsTable.listByTag(review.tag)) {
      const replaced = product.metadata.tags!.flatMap((t) =>
        t !== review.tag ? [t] : into ? [into] : []
      );
      await productsTable.setTags(
        product.account_id,
        product.product_id,
        [...new Set(replaced)]
      );
    }
    await tagsTable.delete(review.tag);
  }
  revalidatePath(adminTagsUrl());
  return ok(null);
}
