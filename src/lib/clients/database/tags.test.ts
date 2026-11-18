/** @jest-environment node */
import type { Product } from "@/types";
import { anyPendingTags, hidePendingTags, tagProps, tagsTable } from "./tags";

const product = (tags?: string[]) =>
  ({ account_id: "a", product_id: "p", metadata: { mirrors: {}, tags } }) as unknown as Product;

beforeEach(() => {
  jest.spyOn(tagsTable, "listAll").mockResolvedValue([
    { tag_id: "ocean" },
    { tag_id: "sea-ice", pending: true },
  ]);
});

test("takes pending tags off, leaving the rest of the product", async () => {
  const [shown] = await hidePendingTags([product(["ocean", "sea-ice"])]);
  expect(shown.metadata).toEqual({ mirrors: {}, tags: ["ocean"] });
});

test("keeps them on a product `keep` picks", async () => {
  const stored = product(["ocean", "sea-ice"]);
  expect(await hidePendingTags([stored], () => true)).toEqual([stored]);
});

test("the form gets approved tags with their categories, and only the product's own pending ones", () => {
  const tags = [
    { tag_id: "ocean", category: "domain" as const },
    { tag_id: "sea-ice", pending: true },
    { tag_id: "someone else's", pending: true },
    { tag_id: "sea", outcome: "rejected" as const },
    { tag_id: "seas", outcome: "merged" as const },
    { tag_id: "climate", outcome: "approved" as const },
  ];
  expect(tagProps(tags, ["ocean", "sea-ice"]).tagOptions).toEqual(["ocean", "climate"]);
  expect(tagProps(tags.slice(0, 3), ["ocean", "sea-ice"])).toEqual({
    tagOptions: ["ocean"],
    tagCategories: { ocean: "domain" },
    pendingTags: ["sea-ice"],
  });
  expect(tagProps(tags).pendingTags).toEqual([]);
});

test("shows products as they are when the tag table can't be read", async () => {
  jest.spyOn(tagsTable, "listAll").mockRejectedValue(new Error("AccessDenied"));
  const stored = [product(["ocean", "sea-ice"])];
  expect(await hidePendingTags(stored)).toBe(stored);
});

test("returns products without pending tags as they are", async () => {
  const stored = [product(["ocean"]), product()];
  const shown = await hidePendingTags(stored);
  expect(shown[0]).toBe(stored[0]);
  expect(shown[1]).toBe(stored[1]);
});

test("says whether any tag is pending, and no when the table can't be read", async () => {
  expect(await anyPendingTags()).toBe(true);
  jest.spyOn(tagsTable, "listAll").mockResolvedValue([{ tag_id: "ocean" }]);
  expect(await anyPendingTags()).toBe(false);
  jest.spyOn(tagsTable, "listAll").mockRejectedValue(new Error("AccessDenied"));
  expect(await anyPendingTags()).toBe(false);
});

describe("decision writes", () => {
  test("deciding a suggestion applies only while it is pending", () => {
    const { Update } = tagsTable.decideItem("sst", { outcome: "rejected", reviewed_by: "root" });
    expect(Update).toMatchObject({
      UpdateExpression:
        "REMOVE pending SET outcome = :outcome, reviewed_by = :reviewed_by, reviewed_at = :reviewed_at",
      ConditionExpression: "pending = :true",
      ExpressionAttributeValues: { ":true": true, ":outcome": "rejected" },
    });
  });

  test("deciding an approved tag applies only while it is on the list", () => {
    const { Update } = tagsTable.decideItem("ocean", {
      outcome: "merged",
      reviewed_by: "root",
      previous: {},
    });
    expect(Update?.ConditionExpression).toContain("attribute_not_exists(pending)");
    expect(Update?.ExpressionAttributeValues).toMatchObject({
      ":approved": "approved",
      ":previous": {},
    });
    expect(Update?.ExpressionAttributeValues).not.toHaveProperty(":true");
  });

  test.each([
    [
      undefined,
      "SET pending = :pending REMOVE outcome, reviewed_by, reviewed_at, merged_into, changed, previous, category",
    ],
    [{}, "REMOVE outcome, reviewed_by, reviewed_at, merged_into, changed, previous"],
    [
      { outcome: "approved" as const, reviewed_by: "bob", reviewed_at: "2026-10-01T00:00:00Z" },
      "SET outcome = :outcome, reviewed_by = :reviewed_by, reviewed_at = :reviewed_at REMOVE merged_into, changed, previous",
    ],
  ])("undoing with previous %p restores it", (previous, expression) => {
    const { Update } = tagsTable.reopenItem("sst", undefined, previous);
    expect(Update?.UpdateExpression).toBe(expression);
    // DynamoDB refuses values the expression doesn't use.
    expect(Object.keys(Update?.ExpressionAttributeValues ?? {})).toEqual(
      expression.match(/:\w+/g) ?? []
    );
  });

  test("undoing applies only while the decision made then stands", () => {
    const { Update } = tagsTable.reopenItem("sst", "2026-10-27T00:00:00Z", {});
    expect(Update?.ConditionExpression).toBe(
      "attribute_exists(outcome) AND reviewed_at = :decided_at"
    );
    expect(Update?.ExpressionAttributeValues).toEqual({ ":decided_at": "2026-10-27T00:00:00Z" });
  });

  test("a tag a rename adds is on the list with no decision on it", () => {
    const { Put } = tagsTable.createItem("sea", "root");
    expect(Put?.Item).toEqual({ tag_id: "sea", reviewed_by: "root", reviewed_at: expect.any(String) });
    expect(Put?.ConditionExpression).toBe("attribute_not_exists(tag_id)");
  });
});
