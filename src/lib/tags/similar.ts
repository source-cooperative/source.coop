/**
 * Approved tags a suggestion looks like, best first, for offering as merges.
 * A heuristic, so the review page shows these as hints and never merges on
 * its own: the same tag spelled without separators, one containing the other,
 * shared words, or a spelling a couple of letters off.
 */
export function similarTags(
  tag: string,
  approved: string[],
  limit = 3
): { tag: string; score: number }[] {
  return approved
    .map((other) => ({ tag: other, score: likeness(tag, other) }))
    .filter(({ score }) => score >= 0.5)
    .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

const squash = (s: string) => s.replace(/[^a-z0-9]/g, "");
// Words the rules in `singular` get wrong, with their singular.
const IRREGULAR = new Map([
  ["analyses", "analysis"],
  ["buses", "bus"],
  ["cookies", "cookie"],
  ["gases", "gas"],
  ["goes", "goes"],
  ["movies", "movie"],
  ["news", "news"],
  ["series", "series"],
  ["species", "species"],
]);

/**
 * A word in the singular, roughly: boundaries → boundary, boxes → box,
 * databases → database, while class, analysis, status, genomics and series
 * stay.
 */
export const singular = (w: string) =>
  IRREGULAR.get(w) ??
  (w.length < 4 || /(ss|is|us|ics)$/.test(w)
    ? w
    : w
        .replace(/ies$/, "y")
        .replace(/(x|z|ch|sh|ss)es$/, "$1")
        .replace(/([^s])s$/, "$1"));

/** A tag with its last word in the singular: `building-footprints` is `building-footprint`. */
export const singularTag = (tag: string) => tag.replace(/[a-z0-9]+$/, singular);

const stems = (s: string) => s.split(/[\s-]+/).filter(Boolean).map(singular);

function likeness(a: string, b: string): number {
  const x = squash(a);
  const y = squash(b);
  if (x === y) return 1;
  const wa = stems(a);
  const wb = stems(b);
  // The same words, one in the plural.
  if (wa.join("-") === wb.join("-")) return 0.95;
  let score = 0;
  if (Math.min(x.length, y.length) > 3 && (x.includes(y) || y.includes(x))) {
    score = 0.85;
  }
  const shared = wa.filter((w) => wb.includes(w)).length;
  if (shared) {
    score = Math.max(score, 0.45 + (0.4 * shared) / Math.max(wa.length, wb.length));
  }
  const distance = editDistance(x, y);
  if (distance <= 2 && Math.min(x.length, y.length) > 4) {
    score = Math.max(score, 0.9 - distance * 0.08);
  }
  return score;
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        previous[j] + 1,
        row[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = row;
  }
  return previous[b.length];
}

/**
 * The approved tags a suggestion splits into when each of its words is one,
 * as `field-boundaries` is `field` and `boundaries`, or null when it doesn't.
 * A word matches an approved tag in the singular or the plural, so
 * `field-boundary` splits the same way.
 */
export function splitTag(tag: string, approved: string[]): string[] | null {
  const words = tag.split("-").filter(Boolean);
  if (words.length < 2) return null;
  const parts = words.map((word) =>
    approved.find((other) => !other.includes("-") && stems(other)[0] === stems(word)[0])
  );
  return parts.every(Boolean) ? [...new Set(parts as string[])] : null;
}
