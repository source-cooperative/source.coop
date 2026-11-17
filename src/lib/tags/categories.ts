/**
 * The groups every approved tag belongs to, one each, in the order the tag
 * picker shows them. Plain data with no imports, so scripts/clean-tags.ts can
 * use it outside the app.
 */
export const TAG_CATEGORIES = [
  { id: "domain", label: "Domain", description: "The subject the data is about." },
  { id: "feature-type", label: "Feature type", description: "What each record represents." },
  { id: "place", label: "Place", description: "Where the data covers." },
  { id: "methodology", label: "Methodology", description: "How the data was made." },
  { id: "sensor", label: "Sensor or platform", description: "The instrument or mission that collected it." },
  { id: "source", label: "Source or project", description: "The organization, dataset or project it comes from." },
  { id: "format", label: "Format", description: "How the files are stored." },
  { id: "temporal-frequency", label: "Temporal frequency", description: "How often a value is recorded." },
] as const;

export type TagCategory = (typeof TAG_CATEGORIES)[number]["id"];

export const TAG_CATEGORY_IDS = TAG_CATEGORIES.map((c) => c.id) as [
  TagCategory,
  ...TagCategory[],
];
