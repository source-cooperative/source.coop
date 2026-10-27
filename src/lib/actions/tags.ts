"use server";

import { getPageSession } from "@/lib";
import * as ops from "@/lib/operations/tags";

/**
 * An admin's decision from the review page: approve the tag, merge it into
 * the approved tags chosen (one `into` value each), or reject it. Resolves to
 * why it was refused, if it was, so the page can say so; a thrown error's
 * message is hidden in production.
 */
export async function reviewTag(
  formData: FormData
): Promise<{ error?: string }> {
  const session = await getPageSession();
  const tag = String(formData.get("tag"));
  const decision = formData.get("decision");
  const into = formData.getAll("into").map(String);
  const result =
    decision === "approve"
      ? await ops.updateTag(session, tag, { pending: false })
      : decision === "merge"
        ? await ops.deleteTag(session, tag, {
            // A merge with no target is refused, not taken as a rejection.
            replace_with: into.length ? into : [""],
          })
        : decision === "reject"
          ? await ops.deleteTag(session, tag, {})
          : null;
  if (!result) return { error: `Unknown decision: ${decision}` };
  return result.ok ? {} : { error: result.message };
}
