/** @jest-environment node */
import type { Product } from "@/types";
import { hidePendingTags, tagProps, tagsTable } from "./tags";

const product = (tags?: string[]) =>
  ({ account_id: "a", product_id: "p", metadata: { mirrors: {}, tags } }) as unknown as Product;

beforeEach(() => {
  jest.spyOn(tagsTable, "listAll").mockResolvedValue([
    { tag_id: "ocean" },
    { tag_id: "sea ice", pending: true },
  ]);
});

test("takes pending tags off, leaving the rest of the product", async () => {
  const [shown] = await hidePendingTags([product(["ocean", "sea ice"])]);
  expect(shown.metadata).toEqual({ mirrors: {}, tags: ["ocean"] });
});

test("keeps them on a product `keep` picks", async () => {
  const stored = product(["ocean", "sea ice"]);
  expect(await hidePendingTags([stored], () => true)).toEqual([stored]);
});

test("the form gets approved tags with their categories, and only the product's own pending ones", () => {
  const tags = [
    { tag_id: "ocean", category: "domain" as const },
    { tag_id: "sea-ice", pending: true },
    { tag_id: "someone-elses", pending: true },
  ];
  expect(tagProps(tags, ["ocean", "sea-ice"])).toEqual({
    tagOptions: ["ocean"],
    tagCategories: { ocean: "domain" },
    pendingTags: ["sea-ice"],
  });
  expect(tagProps(tags).pendingTags).toEqual([]);
});

test("shows products as they are when the tag table can't be read", async () => {
  jest.spyOn(tagsTable, "listAll").mockRejectedValue(new Error("AccessDenied"));
  const stored = [product(["ocean", "sea ice"])];
  expect(await hidePendingTags(stored)).toBe(stored);
});

test("returns products without pending tags as they are", async () => {
  const stored = [product(["ocean"]), product()];
  const shown = await hidePendingTags(stored);
  expect(shown[0]).toBe(stored[0]);
  expect(shown[1]).toBe(stored[1]);
});
