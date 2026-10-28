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
 * approved list where they can be. A keyword that matches nothing and can't be
 * stored as a tag is left out, since suggesting it would fail the save.
 */
export function recommendTags(keywords: string[], approved: string[]): RecommendedTag[] {
  const seen = new Set<string>();
  return keywords.flatMap((raw) => {
    const keyword = canonTag(raw);
    if (!keyword || seen.has(keyword)) return [];
    seen.add(keyword);
    // 0.95 and up is the same tag: spelled without separators, or plural.
    const [best] = similarTags(keyword, approved, 1);
    const tags = best?.score >= 0.95 ? [best.tag] : splitTag(keyword, approved);
    if (!tags && !TAG_PATTERN.test(keyword)) return [];
    return [{ keyword, tags }];
  });
}
