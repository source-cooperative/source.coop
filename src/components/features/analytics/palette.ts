/**
 * Fixed categorical order for analytics series, drawn from the Radix scales
 * the app already ships. Validated (light #fff / dark #191919 surfaces) for
 * lightness band, chroma floor, adjacent-pair CVD separation (worst ΔE 17.5),
 * and ≥3:1 contrast. Hues are assigned by ranked position within one query
 * result and never cycled — overflow folds into "Other" (gray) upstream.
 */
export const SERIES_COLORS = [
  "var(--green-9)", // #30A46C — also the single-series/highlight hue
  "var(--plum-9)", // #AB4ABA
  "var(--orange-10)", // #EF5F00
  "var(--cyan-10)", // #0797B9
  "var(--crimson-9)", // #E93D82
  "var(--indigo-9)", // #3E63DD
];

export const OTHER_COLOR = "var(--gray-8)";

export function seriesColor(key: string, index: number, otherKey: string) {
  return key === otherKey
    ? OTHER_COLOR
    : SERIES_COLORS[index % SERIES_COLORS.length];
}
