"use server";

import { getPageSession } from "@/lib";
import * as ops from "@/lib/operations/tags";

/** Suggests a tag from the product form's picker. */
export async function suggestTag(
  raw: string
): Promise<{ tag: string } | { error: string }> {
  const result = await ops.suggestTag(await getPageSession(), raw);
  return result.ok ? result.value : { error: result.message };
}

/** Applies a decision from the admin tag review page. */
export async function reviewTag(formData: FormData): Promise<void> {
  const result = await ops.reviewTag(
    await getPageSession(),
    Object.fromEntries(formData)
  );
  // The review forms only submit valid choices, so a failure here is a bug or
  // a stale page, and the error page says so.
  if (!result.ok) throw new Error(result.message);
}
