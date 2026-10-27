"use server";

import { getPageSession } from "@/lib";
import * as ops from "@/lib/operations/tags";

/**
 * An admin's decision from the review page: approve the tag, merge it into
 * the approved tag chosen, or reject it. Resolves to why it was refused, if
 * it was, so the page can say so; a thrown error's message is hidden in
 * production.
 */
export async function reviewTag(
  formData: FormData
): Promise<{ error?: string }> {
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
  if (!result) return { error: `Unknown decision: ${decision}` };
  return result.ok ? {} : { error: result.message };
}
