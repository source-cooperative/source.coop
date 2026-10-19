/** @jest-environment node */
import { productsTable, tagsTable } from "@/lib/clients/database";
import { isAdmin } from "@/lib/api/authz";
import { listTags, reviewTag, suggestTag } from "./tags";

jest.mock("@/lib/clients/database", () => ({
  productsTable: { listByTag: jest.fn(), setTags: jest.fn() },
  tagsTable: {
    listAll: jest.fn(),
    suggest: jest.fn(),
    approve: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("@/lib/api/authz", () => ({ isAdmin: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const SESSION = { account: { account_id: "alice" } } as never;

const pending = (tag_id: string, suggested_by = "alice") => ({
  tag_id,
  pending: true,
  suggested_by,
});

beforeEach(() => {
  jest.resetAllMocks();
  (tagsTable.listAll as jest.Mock).mockResolvedValue([
    { tag_id: "ocean", category: "domain" },
    { tag_id: "cog", category: "format" },
  ]);
});

describe("listTags", () => {
  test("lists approved tags with their categories, leaving out pending ones", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue([
      { tag_id: "cog", category: "format" },
      pending("sea-ice"),
    ]);
    expect(await listTags()).toEqual({
      ok: true,
      value: { items: [{ tag: "cog", category: "format" }], next_cursor: null },
    });
  });
});

describe("suggestTag", () => {
  test("normalizes the tag, hyphenating spaces, and adds it as pending", async () => {
    expect(await suggestTag(SESSION, "  Sea   Ice ")).toEqual({
      ok: true,
      value: { tag: "sea-ice" },
    });
    expect(tagsTable.suggest).toHaveBeenCalledWith("sea-ice", "alice");
  });

  test("returns a tag that already exists without suggesting it", async () => {
    expect(await suggestTag(SESSION, "Ocean")).toMatchObject({ value: { tag: "ocean" } });
    expect(tagsTable.suggest).not.toHaveBeenCalled();
  });

  test("refuses a visitor who isn't logged in", async () => {
    expect(await suggestTag(null, "sea ice")).toMatchObject({ error: "unauthenticated" });
    expect(tagsTable.suggest).not.toHaveBeenCalled();
  });

  test.each(["#seaice", "-ice", "sea--ice", "a".repeat(41), ""])(
    "refuses the malformed tag %p",
    async (raw) => {
      expect(await suggestTag(SESSION, raw)).toMatchObject({ error: "invalid" });
      expect(tagsTable.suggest).not.toHaveBeenCalled();
    }
  );

  test("refuses a sixth pending suggestion from one person", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue([
      ...["a1", "a2", "a3", "a4", "a5"].map((t) => pending(t)),
      pending("b1", "bob"),
    ]);
    expect(await suggestTag(SESSION, "sea ice")).toMatchObject({ error: "invalid" });
    expect(tagsTable.suggest).not.toHaveBeenCalled();
  });
});

describe("reviewTag", () => {
  beforeEach(() => {
    (isAdmin as jest.Mock).mockReturnValue(true);
    (productsTable.listByTag as jest.Mock).mockResolvedValue([
      { account_id: "a", product_id: "p1", metadata: { tags: ["sst", "ocean"] } },
      { account_id: "b", product_id: "p2", metadata: { tags: ["climate", "sst"] } },
    ]);
  });

  test("refuses anyone but an admin", async () => {
    (isAdmin as jest.Mock).mockReturnValue(false);
    expect(
      await reviewTag(SESSION, { tag: "sst", decision: "approve", category: "domain" })
    ).toMatchObject({ error: "forbidden" });
    expect(tagsTable.approve).not.toHaveBeenCalled();
  });

  test("approve puts the tag in its category and keeps it on its products", async () => {
    expect(
      await reviewTag(SESSION, { tag: "sst", decision: "approve", category: "domain" })
    ).toMatchObject({ ok: true });
    expect(tagsTable.approve).toHaveBeenCalledWith("sst", "domain");
    expect(productsTable.setTags).not.toHaveBeenCalled();
  });

  test.each([undefined, "colour"])("approve refuses the category %p", async (category) => {
    expect(
      await reviewTag(SESSION, { tag: "sst", decision: "approve", category })
    ).toMatchObject({ error: "invalid", fieldErrors: { category: expect.any(Array) } });
    expect(tagsTable.approve).not.toHaveBeenCalled();
  });

  test("merge swaps the tag on each product, without duplicates", async () => {
    await reviewTag(SESSION, { tag: "sst", decision: "merge", into: "ocean" });
    expect(productsTable.setTags).toHaveBeenCalledWith("a", "p1", ["ocean"]);
    expect(productsTable.setTags).toHaveBeenCalledWith("b", "p2", ["climate", "ocean"]);
    expect(tagsTable.delete).toHaveBeenCalledWith("sst");
  });

  test("merge refuses a target that isn't an approved tag", async () => {
    expect(
      await reviewTag(SESSION, { tag: "sst", decision: "merge", into: "made-up" })
    ).toMatchObject({ error: "invalid" });
    expect(productsTable.setTags).not.toHaveBeenCalled();
    expect(tagsTable.delete).not.toHaveBeenCalled();
  });

  test("reject takes the tag off each product and deletes it", async () => {
    await reviewTag(SESSION, { tag: "sst", decision: "reject" });
    expect(productsTable.setTags).toHaveBeenCalledWith("a", "p1", ["ocean"]);
    expect(productsTable.setTags).toHaveBeenCalledWith("b", "p2", ["climate"]);
    expect(tagsTable.delete).toHaveBeenCalledWith("sst");
  });
});
