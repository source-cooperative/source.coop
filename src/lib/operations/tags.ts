import { z } from "zod";
import { revalidatePath } from "next/cache";
import { UserSession } from "@/types";
import { isAdmin } from "@/lib/api/authz";
import {
  isListed,
  isUsable,
  productsTable,
  tagsTable,
  type Tag,
  type TagChange,
} from "@/lib/clients/database";
import { adminTagsUrl } from "@/lib/urls";
import { canonTag } from "@/lib/tags/canon";
import { TAG_CATEGORY_IDS } from "@/lib/tags/categories";
import { LOGGER } from "@/lib/logging";
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
const TAG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export const TagSchema = z
  .object({
    tag_id: z.string().openapi({ description: "The tag, as products carry it." }),
    category: z.enum(TAG_CATEGORY_IDS).optional().openapi({
      description:
        "The group the tag belongs to, such as `domain`, `place` or `format`. A tag awaiting review has none.",
    }),
    pending: z.boolean().optional().openapi({
      description: "True while the tag awaits review. Approved tags leave it out.",
    }),
    suggested_by: z.string().optional().openapi({
      description:
        "The account that suggested the tag. Only admins see it. Tags from the initial import have none.",
    }),
    suggested_at: z.string().datetime().optional().openapi({
      description: "When the tag was suggested. Only admins see it.",
    }),
    outcome: z.enum(["approved", "merged", "rejected"]).optional().openapi({
      description:
        "An admin's decision on a suggested tag. A merged or rejected tag is off the list and off every product, but stays on record. Only admins see it.",
    }),
    reviewed_by: z.string().optional().openapi({
      description: "The admin who decided. Only admins see it.",
    }),
    reviewed_at: z.string().datetime().optional().openapi({
      description: "When the admin decided. Only admins see it.",
    }),
    merged_into: z.array(z.string()).optional().openapi({
      description: "The approved tags a merged tag was replaced with.",
    }),
    changed: z
      .array(
        z.object({
          account_id: z.string(),
          product_id: z.string(),
          added: z.array(z.string()),
        })
      )
      .optional()
      .openapi({
        description:
          "The products a merge or rejection rewrote, and the tags each gained by it, which undoing the decision reverses. Only admins see it.",
      }),
  })
  .openapi("Tag");

export const ListTagsQuerySchema = z.object({
  pending: z.enum(["true", "false"]).optional().openapi({
    description:
      "`true` lists the tags awaiting review instead of the approved ones. Only admins may ask for them.",
  }),
  reviewed: z.enum(["true", "false"]).optional().openapi({
    description:
      "`true` lists the suggested tags an admin has decided, approved, merged or rejected, most recent first. Only admins may ask for them.",
  }),
});

export const SuggestTagSchema = z
  .object({
    tag_id: z
      .string()
      // Before the pattern, so "  Sea   Ice " is the tag "sea-ice".
      .transform(canonTag)
      .pipe(
        z
          .string()
          .regex(
            TAG_PATTERN,
            "Use up to 40 lowercase letters, digits or hyphens, starting and ending with a letter or digit. Spaces become hyphens."
          )
      )
      .openapi({
        description:
          "The tag to suggest. It is trimmed and lowercased, and its spaces become hyphens, before it is checked: `Sea Ice` is suggested as `sea-ice`.",
      }),
  })
  .openapi("SuggestTag");

export const UpdateTagSchema = z
  .object({
    pending: z.boolean().openapi({
      description:
        "`false` approves a tag awaiting review. `true` undoes an admin's decision and puts the tag back awaiting review; for a merge or rejection, the products it rewrote get the tag back and lose the tags the merge added.",
    }),
    category: z.enum(TAG_CATEGORY_IDS).optional().openapi({
      description: "The category to approve the tag into. Approving requires it.",
    }),
  })
  .openapi("UpdateTag");

export const DeleteTagQuerySchema = z.object({
  replace_with: z
    .array(z.string())
    .optional()
    .openapi({
      description:
        "Approved tags to put in this one's place on every product that carries it. Repeat it to merge into several, as `?replace_with=field&replace_with=boundaries` for `field-boundaries`. Without it, the tag is just taken off them.",
    }),
});

/**
 * The tags on the list, for anyone. Admins may ask instead for the tags
 * awaiting review, or the ones they have decided. Admins also see who
 * suggested and decided each tag, and when.
 */
export async function listTags(
  session: UserSession | null,
  query: unknown
): Promise<OperationResult<Page<Tag>>> {
  const parsed = ListTagsQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const pending = parsed.data.pending === "true";
  const reviewed = parsed.data.reviewed === "true";
  if ((pending || reviewed) && !isAdmin(session)) {
    return deny(session, "Only admins may list the tags awaiting or past review");
  }
  const all = await tagsTable.listAll();
  const tags = pending
    ? all.filter((t) => t.pending)
    : reviewed
      ? all
          .filter((t) => t.outcome)
          .sort((a, b) => (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? ""))
      : all.filter(isListed);
  return ok(
    onePage(
      isAdmin(session) ? tags : tags.map(({ tag_id, category }) => ({ tag_id, category }))
    )
  );
}

/**
 * Checks tags someone wants to suggest, without writing anything: each is
 * spelled the way tags are stored, and the ones the list lacks must fit the
 * suggester's cap. Answers their stored spelling, the rows that already
 * exist, and a `write` that adds the new ones as pending. A product save
 * checks everything else before calling `write`, so a save that fails leaves
 * no suggestion behind on no product.
 */
export async function planSuggestions(
  session: UserSession | null,
  raw: string[],
  field = "tag_id"
): Promise<
  OperationResult<{
    tags: string[];
    existing: Tag[];
    write: () => Promise<Tag[]>;
  }>
> {
  if (!raw.length) return ok({ tags: [], existing: [], write: async () => [] });
  const account_id = session?.account?.account_id;
  if (!account_id) return unauthenticated();
  const tags: string[] = [];
  for (const tag of raw) {
    const parsed = SuggestTagSchema.shape.tag_id.safeParse(tag);
    if (!parsed.success) return invalid(parsed.error.issues[0].message, field);
    if (!tags.includes(parsed.data)) tags.push(parsed.data);
  }

  const all = await tagsTable.listAll();
  // A tag merged or rejected before counts as new: suggesting it again puts
  // it back in the queue.
  const existing = all.filter((t) => tags.includes(t.tag_id) && isUsable(t));
  const fresh = tags.filter((tag) => !existing.some((t) => t.tag_id === tag));
  // ponytail: read then write, so simultaneous suggestions can pass the cap;
  // bounded, and not worth a counter while suggestions are rare.
  const awaiting = all.filter((t) => t.pending && t.suggested_by === account_id);
  if (fresh.length && awaiting.length + fresh.length > MAX_PENDING_PER_ACCOUNT) {
    return conflict(
      `You may have ${MAX_PENDING_PER_ACCOUNT} tags awaiting review at once, and have ${awaiting.length}. Suggest more once they've been reviewed.`
    );
  }
  return ok({
    tags,
    existing,
    write: async () => {
      const written = await Promise.all(
        fresh.map((tag) => tagsTable.suggest(tag, account_id))
      );
      if (written.length) revalidatePath(adminTagsUrl());
      return written;
    },
  });
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
  if (!session?.account?.account_id) return unauthenticated();
  const parsed = SuggestTagSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const plan = await planSuggestions(session, [parsed.data.tag_id]);
  if (!plan.ok) return plan;
  const [existing] = plan.value.existing;
  if (existing) return ok({ tag: existing, created: false });
  const [tag] = await plan.value.write();
  return ok({ tag, created: true });
}

/**
 * Approves a pending tag into a category, adding it to the list everyone
 * picks from; or, with
 * `pending: true`, undoes an admin's decision and puts the tag back awaiting
 * review (see undoDecision).
 */
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
  if (parsed.data.pending) return undoDecision(session!, tag);

  if (isListed(tag)) return ok(tag);
  if (!tag.pending) {
    return conflict(`"${tag_id}" was ${tag.outcome}; undo that before approving it`);
  }
  const { category } = parsed.data;
  if (!category) return invalid("Choose a category to approve the tag into", "category");
  const reviewed_by = session!.account!.account_id;
  if (!(await tagsTable.decide(tag_id, { outcome: "approved", reviewed_by, category }))) {
    return conflict(`"${tag_id}" is not awaiting review`);
  }
  revalidatePath(adminTagsUrl());
  const { pending: _pending, ...rest } = tag;
  return ok({
    ...rest,
    category,
    outcome: "approved",
    reviewed_by,
    reviewed_at: new Date().toISOString(),
  });
}

/**
 * Puts a decided tag back awaiting review. Undoing a merge or rejection also
 * reverses what it did to each product it rewrote: the tag goes back on, and
 * the tags the merge added come off again, leaving any the product had before.
 * An approval changed no product, so undoing it only reopens the tag.
 */
async function undoDecision(
  session: UserSession,
  tag: Tag
): Promise<OperationResult<Tag>> {
  if (tag.pending) return ok(tag);
  if (!tag.outcome) {
    return conflict(`"${tag.tag_id}" wasn't suggested, so there is no decision to undo`);
  }
  // ponytail: one write per product and no transaction; a failure partway
  // leaves the decision standing, and undoing again finishes the job.
  for (const { account_id, product_id, added } of tag.changed ?? []) {
    const product = await productsTable.fetchById(account_id, product_id);
    if (!product) continue;
    const tags = (product.metadata.tags ?? []).filter((t) => !added.includes(t));
    await productsTable.setTags(account_id, product_id, [
      ...new Set([...tags, tag.tag_id]),
    ]);
  }
  if (!(await tagsTable.reopen(tag.tag_id))) {
    return conflict(`"${tag.tag_id}" has no decision to undo`);
  }
  LOGGER.info("Tag decision undone", {
    operation: "updateTag",
    metadata: {
      tag_id: tag.tag_id,
      outcome: tag.outcome,
      by: session.account!.account_id,
      products: tag.changed?.length ?? 0,
    },
  });
  revalidatePath(adminTagsUrl());
  return ok({
    tag_id: tag.tag_id,
    pending: true,
    suggested_by: tag.suggested_by,
    suggested_at: tag.suggested_at,
  });
}

/**
 * Rejects a pending tag, taking it off every product that carries it, or
 * merges it into one or more approved tags by putting those in its place.
 * The tag stays on record with the decision and what it did to each product,
 * so `PATCH` with `pending: true` can undo it. Only a pending tag can be
 * decided: refusing any other keeps a review form left open after another
 * admin decided from deciding again.
 */
export async function deleteTag(
  session: UserSession | null,
  tag_id: string,
  query: unknown
): Promise<OperationResult<Tag>> {
  if (!isAdmin(session)) return deny(session, "Only admins may review tags");
  const parsed = DeleteTagQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const replace_with = [...new Set(parsed.data.replace_with ?? [])];

  const tags = await tagsTable.listAll();
  const tag = tags.find((t) => t.tag_id === tag_id);
  if (!tag) return notFound(`Tag "${tag_id}" not found`);
  if (!tag.pending) return conflict(`"${tag_id}" is not awaiting review`);
  if (replace_with.some((target) => !target)) {
    return invalid("Choose a tag to merge into", "replace_with");
  }
  const unapproved = replace_with.filter(
    (target) => !tags.some((t) => t.tag_id === target && isListed(t))
  );
  if (unapproved.length) {
    return invalid(
      `Not approved tags: ${unapproved.map((t) => `"${t}"`).join(", ")}`,
      "replace_with"
    );
  }

  const carrying = await productsTable.listByTag(tag_id);
  const changed: TagChange[] = carrying.map((p) => ({
    account_id: p.account_id,
    product_id: p.product_id,
    added: replace_with.filter((t) => !p.metadata.tags!.includes(t)),
  }));
  const reviewed_by = session!.account!.account_id;
  const decision = {
    outcome: replace_with.length ? ("merged" as const) : ("rejected" as const),
    reviewed_by,
    ...(replace_with.length && { merged_into: replace_with }),
    changed,
  };
  // Recorded first, and only while the tag is still pending, so two admins
  // can't both decide it; the products follow.
  if (!(await tagsTable.decide(tag_id, decision))) {
    return conflict(`"${tag_id}" is not awaiting review`);
  }
  // ponytail: one write per product and no transaction; a failure partway
  // leaves some products unchanged, which undoing the decision tolerates.
  for (const product of carrying) {
    const replaced = product.metadata.tags!.flatMap((t) =>
      t !== tag_id ? [t] : replace_with
    );
    await productsTable.setTags(product.account_id, product.product_id, [
      ...new Set(replaced),
    ]);
  }
  LOGGER.info(replace_with.length ? "Tag merged" : "Tag rejected", {
    operation: "deleteTag",
    metadata: { tag_id, replace_with, by: reviewed_by, products: carrying.length },
  });
  revalidatePath(adminTagsUrl());
  const { pending: _pending, ...rest } = tag;
  return ok({ ...rest, ...decision, reviewed_at: new Date().toISOString() });
}
