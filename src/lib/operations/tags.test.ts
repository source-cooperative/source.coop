/** @jest-environment node */
import { productsTable, tagsTable } from "@/lib/clients/database";
import { isAdmin } from "@/lib/api/authz";
import { deleteTag, listTags, suggestTag, updateTag } from "./tags";

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

const ALICE = { account: { account_id: "alice" } } as never;
const pending = (tag_id: string, suggested_by = "alice") => ({
  tag_id,
  pending: true,
  suggested_by,
  suggested_at: "2026-10-26T00:00:00.000Z",
});

beforeEach(() => {
  jest.resetAllMocks();
  (tagsTable.listAll as jest.Mock).mockResolvedValue([
    { tag_id: "climate" },
    { tag_id: "ocean" },
    pending("sst"),
  ]);
  (tagsTable.suggest as jest.Mock).mockImplementation(async (tag_id, by) =>
    pending(tag_id, by)
  );
});

describe("listTags", () => {
  test("lists approved tags to anyone, without review details", async () => {
    expect(await listTags(null, {})).toEqual({
      ok: true,
      value: { items: [{ tag_id: "climate" }, { tag_id: "ocean" }], next_cursor: null },
    });
  });

  test("lists pending tags only to admins", async () => {
    expect(await listTags(null, { pending: "true" })).toMatchObject({
      error: "unauthenticated",
    });
    expect(await listTags(ALICE, { pending: "true" })).toMatchObject({
      error: "forbidden",
    });
    (isAdmin as jest.Mock).mockReturnValue(true);
    expect(await listTags(ALICE, { pending: "true" })).toEqual({
      ok: true,
      value: { items: [pending("sst")], next_cursor: null },
    });
  });
});

describe("suggestTag", () => {
  test("normalizes the tag and adds it as pending", async () => {
    const result = await suggestTag(ALICE, { tag_id: "  Sea   Ice " });
    expect(result).toEqual({
      ok: true,
      value: { tag: pending("sea ice"), created: true },
    });
    expect(tagsTable.suggest).toHaveBeenCalledWith("sea ice", "alice");
  });

  test("answers a tag that already exists, without suggesting it", async () => {
    expect(await suggestTag(ALICE, { tag_id: "Ocean" })).toEqual({
      ok: true,
      value: { tag: { tag_id: "ocean" }, created: false },
    });
    expect(tagsTable.suggest).not.toHaveBeenCalled();
  });

  test("refuses a visitor who isn't logged in", async () => {
    expect(await suggestTag(null, { tag_id: "sea ice" })).toMatchObject({
      error: "unauthenticated",
    });
  });

  test.each(["#seaice", "-ice", "a".repeat(41), ""])(
    "refuses the malformed tag %p",
    async (tag_id) => {
      expect(await suggestTag(ALICE, { tag_id })).toMatchObject({
        error: "invalid",
        fieldErrors: { tag_id: expect.any(Array) },
      });
      expect(tagsTable.suggest).not.toHaveBeenCalled();
    }
  );

  test("refuses a sixth pending suggestion from one account", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue([
      ...["a1", "a2", "a3", "a4", "a5"].map((t) => pending(t)),
      pending("b1", "bob"),
    ]);
    expect(await suggestTag(ALICE, { tag_id: "sea ice" })).toMatchObject({
      error: "conflict",
    });
    expect(tagsTable.suggest).not.toHaveBeenCalled();
  });
});

describe("reviewing", () => {
  beforeEach(() => {
    (isAdmin as jest.Mock).mockReturnValue(true);
    (productsTable.listByTag as jest.Mock).mockResolvedValue([
      { account_id: "a", product_id: "p1", metadata: { tags: ["sst", "ocean"] } },
      { account_id: "b", product_id: "p2", metadata: { tags: ["climate", "sst"] } },
    ]);
  });

  test("only admins may approve or delete", async () => {
    (isAdmin as jest.Mock).mockReturnValue(false);
    expect(await updateTag(ALICE, "sst", { pending: false })).toMatchObject({
      error: "forbidden",
    });
    expect(await deleteTag(null, "sst", {})).toMatchObject({
      error: "unauthenticated",
    });
    expect(tagsTable.approve).not.toHaveBeenCalled();
    expect(tagsTable.delete).not.toHaveBeenCalled();
  });

  test("approving keeps the tag on its products, and repeats harmlessly", async () => {
    expect(await updateTag(ALICE, "sst", { pending: false })).toEqual({
      ok: true,
      value: { tag_id: "sst" },
    });
    expect(tagsTable.approve).toHaveBeenCalledWith("sst");
    expect(productsTable.setTags).not.toHaveBeenCalled();

    await updateTag(ALICE, "ocean", { pending: false });
    expect(tagsTable.approve).toHaveBeenCalledTimes(1);
  });

  test("approving a tag that doesn't exist is not found", async () => {
    expect(await updateTag(ALICE, "nope", { pending: false })).toMatchObject({
      error: "not_found",
    });
  });

  test("merging swaps the tag on each product, without duplicates", async () => {
    expect(await deleteTag(ALICE, "sst", { replace_with: "ocean" })).toEqual({
      ok: true,
      value: pending("sst"),
    });
    expect(productsTable.setTags).toHaveBeenCalledWith("a", "p1", ["ocean"]);
    expect(productsTable.setTags).toHaveBeenCalledWith("b", "p2", ["climate", "ocean"]);
    expect(tagsTable.delete).toHaveBeenCalledWith("sst");
  });

  test.each(["made-up", "sst", ""])(
    "merging refuses %p, which isn't an approved tag",
    async (replace_with) => {
      expect(await deleteTag(ALICE, "sst", { replace_with })).toMatchObject({
        error: "invalid",
        fieldErrors: { replace_with: expect.any(Array) },
      });
      expect(productsTable.setTags).not.toHaveBeenCalled();
      expect(tagsTable.delete).not.toHaveBeenCalled();
    }
  );

  test("rejecting takes the tag off each product and deletes it", async () => {
    await deleteTag(ALICE, "sst", {});
    expect(productsTable.setTags).toHaveBeenCalledWith("a", "p1", ["ocean"]);
    expect(productsTable.setTags).toHaveBeenCalledWith("b", "p2", ["climate"]);
    expect(tagsTable.delete).toHaveBeenCalledWith("sst");
  });

  test("an approved tag can't be deleted, as from a stale review form", async () => {
    expect(await deleteTag(ALICE, "ocean", {})).toMatchObject({ error: "conflict" });
    expect(productsTable.setTags).not.toHaveBeenCalled();
    expect(tagsTable.delete).not.toHaveBeenCalled();
  });
});
