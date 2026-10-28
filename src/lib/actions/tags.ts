"use server";

import { getPageSession } from "@/lib";
import * as ops from "@/lib/operations/tags";

/**
 * An admin's decision from the tags page: approve the tag into the
 * `category` chosen, merge it into the tags chosen (one `into` value each, a
 * new spelling renaming it), reject or remove it, or undo an earlier
 * decision. `approved=true` merges or removes an approved tag rather than a
 * suggestion. Resolves to why it was refused, if it was, so the page can say
 * so; a thrown error's message is hidden in production.
 */
export async function reviewTag(
  formData: FormData
): Promise<{ error?: string }> {
  const session = await getPageSession();
  const tag = String(formData.get("tag"));
  const decision = formData.get("decision");
  const into = formData.getAll("into").map(String);
  const approved = formData.get("approved") === "true" ? "true" : undefined;
  const result =
    decision === "approve"
      ? await ops.updateTag(session, tag, {
          pending: false,
          category: formData.get("category") || undefined,
        })
      : decision === "merge"
        ? await ops.deleteTag(session, tag, {
            // A merge with no target is refused, not taken as a rejection.
            replace_with: into.length ? into : [""],
            approved,
          })
        : decision === "reject"
          ? await ops.deleteTag(session, tag, { approved })
          : decision === "undo"
            ? await ops.updateTag(session, tag, {
                pending: true,
                reviewed_at: formData.get("reviewed_at") || undefined,
              })
            : null;
  if (!result) return { error: `Unknown decision: ${decision}` };
  return result.ok ? {} : { error: result.message };
}
