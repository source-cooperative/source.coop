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
import { MAX_TRANSACTION_ITEMS, type TransactItem } from "@/lib/clients/database/base";
import { adminTagsUrl } from "@/lib/urls";
import { canonTag, TAG_PATTERN } from "@/lib/tags/canon";
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
const PATTERN_RULE =
  "Use up to 40 lowercase letters, digits or hyphens, starting and ending with a letter or digit. Spaces become hyphens.";

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
        "An admin's latest decision on the tag. A merged or rejected tag is off the list and off every product, but stays on record. Only admins see it.",
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
    previous: z
      .object({
        outcome: z.literal("approved").optional(),
        reviewed_by: z.string().optional(),
        reviewed_at: z.string().datetime().optional(),
      })
      .optional()
      .openapi({
        description:
          "For an approved tag an admin merged or removed, its review before that, which undoing restores. Empty for a tag from the initial import. Only admins see it.",
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
          .regex(TAG_PATTERN, PATTERN_RULE)
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
    reviewed_at: z.string().datetime().optional().openapi({
      description:
        "With `pending: true`, the `reviewed_at` of the decision to undo. A tag decided again since, or already undone, returns 409 rather than undoing the decision before it.",
    }),
  })
  .openapi("UpdateTag");

export const DeleteTagQuerySchema = z.object({
  replace_with: z
    .array(z.string())
    .optional()
    .openapi({
      description:
        "Tags to put in this one's place on every product that carries it. Repeat it to merge into several, as `?replace_with=field&replace_with=boundaries` for `field-boundaries`. With `approved=true`, a spelling never used is added to the list, which renames the tag; a merged or rejected tag can't be one until that decision is undone. Without it, the tag is just taken off them.",
    }),
  approved: z.enum(["true", "false"]).optional().openapi({
    description:
      "`true` merges or removes an approved tag instead of one awaiting review. Each refuses a tag in the other state, so a form left open after the tag changed can't act on it.",
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
  // Suggesting a merged or rejected tag afresh would overwrite the record that
  // undoing the decision needs, so it waits for an admin to undo it instead.
  for (const t of all) {
    if (!tags.includes(t.tag_id) || isUsable(t)) continue;
    const message = t.merged_into?.length
      ? `"${t.tag_id}" was merged into ${t.merged_into.map((m) => `"${m}"`).join(" and ")}; use that instead`
      : `"${t.tag_id}" was rejected; an admin can undo that on the tags page`;
    return conflict(message, { [field]: [message] });
  }
  const existing = all.filter((t) => tags.includes(t.tag_id));
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
  if (parsed.data.pending) return undoDecision(session!, tag, parsed.data.reviewed_at);

  if (isListed(tag)) return ok(tag);
  if (!tag.pending) {
    return conflict(`"${tag_id}" was ${tag.outcome}; undo that before approving it`);
  }
  const { category } = parsed.data;
  if (!category) return invalid("Choose a category to approve the tag into", "category");
  const reviewed_by = session!.account!.account_id;
  if (
    !(await tagsTable.transact([
      tagsTable.decideItem(tag_id, { outcome: "approved", reviewed_by, category }),
    ]))
  ) {
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
 * Applies writes in order, in as few transactions as DynamoDB allows, each
 * all or nothing. Answers how many had been written when one was refused, a
 * condition having failed or another write having raced it, or undefined
 * when every one was. Callers order the writes so that whatever repairs the
 * products is recorded before any product changes.
 */
async function commit(items: TransactItem[]): Promise<number | undefined> {
  // ponytail: past one transaction the whole isn't atomic, only each batch;
  // a tag on 100+ products is rare, and a refused batch is reported.
  for (let i = 0; i < items.length; i += MAX_TRANSACTION_ITEMS) {
    if (!(await tagsTable.transact(items.slice(i, i + MAX_TRANSACTION_ITEMS)))) return i;
  }
}

const RACED = "changed while this was being saved, so nothing was changed. Reload and try again.";

/**
 * Undoes a decision. A suggestion goes back awaiting review; an approved or
 * seeded tag an admin merged or removed goes back on the list as it was.
 * Undoing a merge or rejection also reverses what it did to each product it
 * rewrote: the tag goes back on, and the tags the merge added come off again,
 * leaving any the product had before. An approval changed no product, so
 * undoing it only reopens the tag. Given `reviewed_at`, only the decision made
 * then is undone: undoing an approved tag's merge leaves it approved, so a
 * second click would otherwise undo the approval too.
 */
async function undoDecision(
  session: UserSession,
  tag: Tag,
  reviewed_at?: string
): Promise<OperationResult<Tag>> {
  if (reviewed_at && reviewed_at !== tag.reviewed_at) {
    return conflict(`"${tag.tag_id}" has been decided or undone since. Reload and try again.`);
  }
  if (tag.pending) return ok(tag);
  if (!tag.outcome) {
    return conflict(`"${tag.tag_id}" has no decision to undo`);
  }
  const restoring = (
    await Promise.all(
      (tag.changed ?? []).map(async (change) => ({
        change,
        product: await productsTable.fetchById(change.account_id, change.product_id),
      }))
    )
  ).filter(({ product }) => product);
  const writes = restoring.map(({ change: { account_id, product_id, added }, product }) => {
    const tags = product!.metadata.tags ?? [];
    return productsTable.setTagsItem(account_id, product_id, tags, [
      ...new Set([...tags.filter((t) => !added.includes(t)), tag.tag_id]),
    ]);
  });
  // The tag's record goes last, so until every product is restored the
  // decision stands and undoing again finishes the job.
  const written = await commit([
    ...writes,
    tagsTable.reopenItem(tag.tag_id, tag.reviewed_at, tag.previous),
  ]);
  if (written !== undefined) {
    // Some products changed, so the page should show them as they are now.
    if (written) revalidatePath(adminTagsUrl());
    return conflict(
      written
        ? `Only ${written} of ${writes.length} products were restored, because one changed meanwhile. Undo again to finish.`
        : `"${tag.tag_id}" or one of its products ${RACED}`
    );
  }
  LOGGER.info("Tag decision undone", {
    operation: "updateTag",
    metadata: {
      tag_id: tag.tag_id,
      outcome: tag.outcome,
      by: session.account!.account_id,
      products: writes.length,
    },
  });
  revalidatePath(adminTagsUrl());
  const { tag_id, category, suggested_by, suggested_at } = tag;
  return ok(
    tag.previous
      ? { tag_id, category, suggested_by, suggested_at, ...tag.previous }
      : { tag_id, pending: true, suggested_by, suggested_at }
  );
}

/**
 * Why a tag can't replace `tag_id`, if it can't. Only an approved tag can be
 * renamed to a spelling never used: a suggestion merges into approved tags,
 * so a typo is refused rather than added to the list with no category.
 */
function badTarget(
  tag_id: string,
  target: string,
  tags: Tag[],
  approved: boolean
): string | undefined {
  if (!target) return "Choose a tag to merge into";
  if (target === tag_id) return `"${tag_id}" can't be merged into itself`;
  if (!TAG_PATTERN.test(target)) return `"${target}" isn't a tag: ${PATTERN_RULE}`;
  const existing = tags.find((t) => t.tag_id === target);
  if (existing?.pending) return `"${target}" is awaiting review; review it first`;
  // Its record holds what undoing that decision needs, which adding the tag
  // afresh would overwrite.
  if (existing && !isListed(existing)) {
    return `"${target}" was ${existing.outcome}; undo that first, or choose another tag`;
  }
  if (!existing && !approved) return `"${target}" is not an approved tag`;
}

/**
 * Takes a tag off every product that carries it, or merges it into others by
 * putting those in its place. For an approved tag, a target the list lacks is
 * added to it, which renames the tag. By default the tag must be awaiting review, which this
 * rejects or merges; with `approved: true`, it must be on the list. Refusing
 * the other state keeps a form left open after another admin acted from
 * acting again. The tag stays on record with the decision and what it did to
 * each product, so `PATCH` with `pending: true` can undo it.
 */
export async function deleteTag(
  session: UserSession | null,
  tag_id: string,
  query: unknown
): Promise<OperationResult<Tag>> {
  if (!isAdmin(session)) return deny(session, "Only admins may review tags");
  const parsed = DeleteTagQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const replace_with = [...new Set((parsed.data.replace_with ?? []).map(canonTag))];
  const approved = parsed.data.approved === "true";

  const tags = await tagsTable.listAll();
  const tag = tags.find((t) => t.tag_id === tag_id);
  if (!tag) return notFound(`Tag "${tag_id}" not found`);
  if (approved ? !isListed(tag) : !tag.pending) {
    return conflict(`"${tag_id}" is not ${approved ? "an approved tag" : "awaiting review"}`);
  }
  for (const target of replace_with) {
    const problem = badTarget(tag_id, target, tags, approved);
    if (problem) return invalid(problem, "replace_with");
  }
  const created = replace_with.filter((target) => !tags.some((t) => t.tag_id === target));

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
    reviewed_at: new Date().toISOString(),
    ...(replace_with.length && { merged_into: replace_with }),
    changed,
    ...(approved && {
      previous: {
        outcome: tag.outcome,
        reviewed_by: tag.reviewed_by,
        reviewed_at: tag.reviewed_at,
      },
    }),
  };
  // The decision goes first, holding what each product gains: it applies only
  // while the tag is in the state read, so two admins can't both act on it,
  // and once any product changes, undoing can repair it.
  const written = await commit([
    tagsTable.decideItem(tag_id, decision),
    ...created.map((t) => tagsTable.createItem(t, reviewed_by, tag.category)),
    ...carrying.map((p) =>
      productsTable.setTagsItem(p.account_id, p.product_id, p.metadata.tags!, [
        ...new Set(p.metadata.tags!.flatMap((t) => (t !== tag_id ? [t] : replace_with))),
      ])
    ),
  ]);
  if (written !== undefined) {
    if (!written) return conflict(`"${tag_id}", a tag it merges into, or one of its products ${RACED}`);
    // Batches apply in order, so the products written are the first ones. The
    // record keeps only those, so undoing leaves the rest, which this never
    // touched, as their owners have them.
    const updated = written - 1 - created.length;
    await tagsTable.transact([
      tagsTable.changedItem(tag_id, decision.reviewed_at, changed.slice(0, updated)),
    ]);
    // The decision and some products changed, so the page should show the
    // decision, with the Undo the message points to.
    revalidatePath(adminTagsUrl());
    return conflict(
      `Only ${updated} of ${carrying.length} products were updated, because one changed meanwhile. Undo this, then try again.`
    );
  }
  LOGGER.info(replace_with.length ? "Tag merged" : "Tag rejected", {
    operation: "deleteTag",
    metadata: { tag_id, replace_with, created, approved, by: reviewed_by, products: carrying.length },
  });
  revalidatePath(adminTagsUrl());
  const { pending: _pending, ...rest } = tag;
  return ok({ ...rest, ...decision });
}
