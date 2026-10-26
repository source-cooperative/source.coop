"use server";

import { getPageSession } from "@/lib";
import * as ops from "@/lib/operations/tags";

/**
 * Suggests the picker's filter text as a new tag. Resolves to the tag as
 * stored, which may be one that already existed, or to why it was refused.
 */
export async function suggestTag(
  raw: string
): Promise<{ tag: string } | { error: string }> {
  const result = await ops.suggestTag(await getPageSession(), { tag_id: raw });
  return result.ok ? { tag: result.value.tag.tag_id } : { error: result.message };
}

/**
 * An admin's decision from the review page: approve the tag, merge it into
 * the approved tag chosen, or reject it.
 */
export async function reviewTag(formData: FormData): Promise<void> {
  const session = await getPageSession();
  const tag = String(formData.get("tag"));
  const decision = formData.get("decision");
  const result =
    decision === "approve"
      ? await ops.updateTag(session, tag, { pending: false })
      : decision === "merge"
        ? await ops.deleteTag(session, tag, {
            replace_with: String(formData.get("into") ?? ""),
          })
        : decision === "reject"
          ? await ops.deleteTag(session, tag, {})
          : null;
  if (!result) throw new Error(`Unknown decision: ${decision}`);
  if (!result.ok) throw new Error(result.message);
}
