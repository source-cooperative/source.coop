import { canonTag, TAG_PATTERN } from "./canon";
import { similarTags, splitTag } from "./similar";

export interface RecommendedTag {
  /** The keyword, in the spelling tags are stored in. */
  keyword: string;
  /**
   * The approved tags it stands for: itself, the same tag spelled another way
   * or in the plural, or each of its words (`field-boundaries` is `field` and
   * `boundaries`). Null when no approved tag fits, so adding it suggests it.
   */
  tags: string[] | null;
}

/**
 * Turns a product's catalog keywords into tags it could carry, matched to the
 * approved list where they can be. A keyword an admin merged stands for the
 * tags that replaced it, and one rejected is left out, as `decided` says. So
 * is a keyword that matches nothing and can't be stored as a tag, since
 * suggesting it would fail the save. Keywords for the same tags are one
 * recommendation.
 */
export function recommendTags(
  keywords: string[],
  approved: string[],
  decided: Record<string, string[] | null> = {}
): RecommendedTag[] {
  const seen = new Set<string>();
  return keywords.flatMap((raw) => {
    const keyword = canonTag(raw);
    if (!keyword) return [];
    let tags: string[] | null;
    if (keyword in decided) {
      tags = decided[keyword]?.filter((t) => approved.includes(t)) ?? [];
      if (!tags.length) return [];
    } else {
      // 0.95 and up is the same tag: spelled without separators, or plural.
      const [best] = similarTags(keyword, approved, 1);
      tags = best?.score >= 0.95 ? [best.tag] : splitTag(keyword, approved);
      if (!tags && !TAG_PATTERN.test(keyword)) return [];
    }
    const key = tags ? [...tags].sort().join(" ") : keyword;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ keyword, tags }];
  });
}
