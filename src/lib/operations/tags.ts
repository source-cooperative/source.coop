import { z } from "zod";
import { revalidatePath } from "next/cache";
import { UserSession } from "@/types";
import { isAdmin } from "@/lib/api/authz";
import { productsTable, tagsTable, type Tag } from "@/lib/clients/database";
import { adminTagsUrl } from "@/lib/urls";
import {
  conflict,
  deny,
  fromZodError,
  invalid,
  notFound,
  ok,
  onePage,
  OperationResult,
  Page,
  unauthenticated,
} from "./result";

const MAX_PENDING_PER_ACCOUNT = 5;
const TAG_PATTERN = /^[a-z0-9](?:[a-z0-9 -]{0,38}[a-z0-9])?$/;

export const TagSchema = z
  .object({
    tag_id: z.string().openapi({ description: "The tag, as products carry it." }),
    pending: z.boolean().optional().openapi({
      description: "True while the tag awaits review. Approved tags leave it out.",
    }),
    suggested_by: z.string().optional().openapi({
      description: "The account that suggested the tag, while it awaits review.",
    }),
    suggested_at: z.string().datetime().optional().openapi({
      description: "When the tag was suggested, while it awaits review.",
    }),
  })
  .openapi("Tag");

export const ListTagsQuerySchema = z.object({
  pending: z.enum(["true", "false"]).optional().openapi({
    description:
      "`true` lists the tags awaiting review instead of the approved ones. Only admins may ask for them.",
  }),
});

export const SuggestTagSchema = z
  .object({
    tag_id: z
      .string()
      // Before the pattern, so "  Sea   Ice " is the tag "sea ice".
      .transform((tag) => tag.trim().toLowerCase().replace(/\s+/g, " "))
      .pipe(
        z
          .string()
          .regex(
            TAG_PATTERN,
            "Use up to 40 lowercase letters, digits, spaces or hyphens, starting and ending with a letter or digit."
          )
      )
      .openapi({
        description:
          "The tag to suggest. It is trimmed, lowercased and its spaces collapsed before it is checked.",
      }),
  })
  .openapi("SuggestTag");

export const UpdateTagSchema = z
  .object({
    pending: z.literal(false).openapi({
      description: "`false` approves the tag.",
    }),
  })
  .openapi("UpdateTag");

export const DeleteTagQuerySchema = z.object({
  replace_with: z.string().min(1, "Choose a tag to merge into").optional().openapi({
    description:
      "An approved tag to put in this one's place on every product that carries it. Without it, the tag is just taken off them.",
  }),
});

/** Approved tags for anyone; pending ones for admins who ask. */
export async function listTags(
  session: UserSession | null,
  query: unknown
): Promise<OperationResult<Page<Tag>>> {
  const parsed = ListTagsQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const pending = parsed.data.pending === "true";
  if (pending && !isAdmin(session)) {
    return deny(session, "Only admins may list the tags awaiting review");
  }
  const tags = await tagsTable.listAll();
  return ok(
    onePage(
      pending
        ? tags.filter((t) => t.pending)
        : tags.filter((t) => !t.pending).map(({ tag_id }) => ({ tag_id }))
    )
  );
}

/**
 * Suggests a tag the list doesn't have. It is added as pending, which lets
 * products carry it until an admin reviews it. A tag that already exists,
 * pending or not, is answered as it is, with `created` false.
 */
export async function suggestTag(
  session: UserSession | null,
  input: unknown
): Promise<OperationResult<{ tag: Tag; created: boolean }>> {
  const account_id = session?.account?.account_id;
  if (!account_id) return unauthenticated();
  const parsed = SuggestTagSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { tag_id } = parsed.data;

  const tags = await tagsTable.listAll();
  const existing = tags.find((t) => t.tag_id === tag_id);
  if (existing) return ok({ tag: existing, created: false });
  // ponytail: read then write, so simultaneous suggestions can pass the cap;
  // bounded, and not worth a counter while suggestions are rare.
  const awaiting = tags.filter((t) => t.pending && t.suggested_by === account_id);
  if (awaiting.length >= MAX_PENDING_PER_ACCOUNT) {
    return conflict(
      `You have ${awaiting.length} tags awaiting review. Suggest more once they've been reviewed.`
    );
  }

  const tag = await tagsTable.suggest(tag_id, account_id);
  revalidatePath(adminTagsUrl());
  return ok({ tag, created: true });
}

/** Approves a pending tag, adding it to the list everyone picks from. */
export async function updateTag(
  session: UserSession | null,
  tag_id: string,
  input: unknown
): Promise<OperationResult<Tag>> {
  if (!isAdmin(session)) return deny(session, "Only admins may review tags");
  const parsed = UpdateTagSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const tag = (await tagsTable.listAll()).find((t) => t.tag_id === tag_id);
  if (!tag) return notFound(`Tag "${tag_id}" not found`);
  if (tag.pending) await tagsTable.approve(tag_id);
  revalidatePath(adminTagsUrl());
  return ok({ tag_id });
}

/**
 * Rejects a pending tag, taking it off every product that carries it, or
 * merges it into an approved tag by putting that one in its place. Only a
 * pending tag can go: refusing an approved one keeps a review form left open
 * after another admin approved the tag from stripping it from every product.
 */
export async function deleteTag(
  session: UserSession | null,
  tag_id: string,
  query: unknown
): Promise<OperationResult<Tag>> {
  if (!isAdmin(session)) return deny(session, "Only admins may review tags");
  const parsed = DeleteTagQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const { replace_with } = parsed.data;

  const tags = await tagsTable.listAll();
  const tag = tags.find((t) => t.tag_id === tag_id);
  if (!tag) return notFound(`Tag "${tag_id}" not found`);
  if (!tag.pending) return conflict(`"${tag_id}" is not awaiting review`);
  if (replace_with && !tags.some((t) => t.tag_id === replace_with && !t.pending)) {
    return invalid(`"${replace_with}" is not an approved tag`, "replace_with");
  }

  // ponytail: one write per product and no transaction; a failure partway
  // leaves the tag pending, and deleting it again finishes the job.
  for (const product of await productsTable.listByTag(tag_id)) {
    const replaced = product.metadata.tags!.flatMap((t) =>
      t !== tag_id ? [t] : replace_with ? [replace_with] : []
    );
    await productsTable.setTags(product.account_id, product.product_id, [
      ...new Set(replaced),
    ]);
  }
  await tagsTable.delete(tag_id);
  revalidatePath(adminTagsUrl());
  return ok(tag);
}
