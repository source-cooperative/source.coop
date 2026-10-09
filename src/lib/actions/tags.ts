"use server";

import { revalidatePath } from "next/cache";
import { getPageSession } from "@/lib";
import { isAdmin } from "@/lib/api/authz";
import { productsTable, tagsTable } from "@/lib/clients/database";
import { adminTagsUrl } from "@/lib/urls";

const MAX_PENDING_PER_USER = 5;
const TAG_PATTERN = /^[a-z0-9](?:[a-z0-9 -]{0,38}[a-z0-9])?$/;

/**
 * Suggests a tag that isn't in the corpus yet. It is added as pending, which
 * lets products carry it until an admin reviews it. Suggesting a tag that
 * already exists, pending or not, just returns it.
 */
export async function suggestTag(
  raw: string
): Promise<{ tag: string } | { error: string }> {
  const account_id = (await getPageSession())?.account?.account_id;
  if (!account_id) return { error: "Log in to suggest a tag." };

  const tag = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!TAG_PATTERN.test(tag)) {
    return {
      error:
        "Use up to 40 lowercase letters, digits, spaces or hyphens, starting and ending with a letter or digit.",
    };
  }

  const tags = await tagsTable.listAll();
  if (tags.some((t) => t.tag_id === tag)) return { tag };
  const pending = tags.filter((t) => t.pending && t.suggested_by === account_id);
  if (pending.length >= MAX_PENDING_PER_USER) {
    return {
      error: `You have ${pending.length} tags awaiting review. Suggest more once they've been reviewed.`,
    };
  }

  await tagsTable.suggest(tag, account_id);
  return { tag };
}

/**
 * An admin's decision on a pending tag: approve it into the corpus, merge it
 * into an existing tag on every product that carries it, or reject it and take
 * it off those products.
 */
export async function reviewTag(formData: FormData): Promise<void> {
  if (!isAdmin(await getPageSession())) throw new Error("Not authorized");

  const tag = String(formData.get("tag"));
  const decision = formData.get("decision");
  const into = String(formData.get("into") ?? "");

  if (decision === "approve") {
    await tagsTable.approve(tag);
  } else if (decision === "merge" || decision === "reject") {
    if (decision === "merge") {
      const corpus = await tagsTable.listAll();
      if (!corpus.some((t) => t.tag_id === into && !t.pending)) {
        throw new Error(`Can't merge into "${into}": not an approved tag`);
      }
    }
    for (const product of await productsTable.listByTag(tag)) {
      const replaced = product.metadata.tags!.flatMap((t) =>
        t !== tag ? [t] : decision === "merge" ? [into] : []
      );
      await productsTable.setTags(
        product.account_id,
        product.product_id,
        [...new Set(replaced)]
      );
    }
    await tagsTable.delete(tag);
  } else {
    throw new Error(`Unknown decision: ${decision}`);
  }
  revalidatePath(adminTagsUrl());
}
