/** @jest-environment node */
import { productsTable, tagsTable } from "@/lib/clients/database";
import { isAdmin } from "@/lib/api/authz";
import { deleteTag, listTags, suggestTag, updateTag } from "./tags";

jest.mock("@/lib/clients/database", () => {
  const { isListed, isUsable } = jest.requireActual("@/lib/clients/database/tags");
  return {
    isListed,
    isUsable,
    productsTable: { listByTag: jest.fn(), setTags: jest.fn(), fetchById: jest.fn() },
    tagsTable: {
      listAll: jest.fn(),
      suggest: jest.fn(),
      decide: jest.fn(),
      reopen: jest.fn(),
    },
  };
});
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
  (tagsTable.decide as jest.Mock).mockResolvedValue(true);
  (tagsTable.reopen as jest.Mock).mockResolvedValue(true);
});

describe("listTags", () => {
  test("lists approved tags to anyone, without review details", async () => {
    expect(await listTags(null, {})).toEqual({
      ok: true,
      value: { items: [{ tag_id: "climate" }, { tag_id: "ocean" }], next_cursor: null },
    });
  });

  test("shows admins who suggested and approved each tag, and leaves decided ones off", async () => {
    const approved = {
      tag_id: "ocean",
      suggested_by: "noaa",
      outcome: "approved",
      reviewed_by: "root",
      reviewed_at: "2026-10-27T00:00:00.000Z",
    };
    (tagsTable.listAll as jest.Mock).mockResolvedValue([
      approved,
      pending("sst"),
      { tag_id: "sea", outcome: "rejected" },
      { tag_id: "seas", outcome: "merged", merged_into: ["ocean"] },
    ]);
    (isAdmin as jest.Mock).mockReturnValue(true);
    expect(await listTags(ALICE, {})).toEqual({
      ok: true,
      value: { items: [approved], next_cursor: null },
    });
    (isAdmin as jest.Mock).mockReturnValue(false);
    expect(await listTags(ALICE, {})).toEqual({
      ok: true,
      value: { items: [{ tag_id: "ocean" }], next_cursor: null },
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
      value: { tag: pending("sea-ice"), created: true },
    });
    expect(tagsTable.suggest).toHaveBeenCalledWith("sea-ice", "alice");
  });

  test("spells a suggestion the way tags are stored", async () => {
    expect(await suggestTag(ALICE, { tag_id: "#Sea - Ice" })).toMatchObject({
      ok: true,
      value: { tag: { tag_id: "sea-ice" } },
    });
  });

  test("answers a tag that already exists, without suggesting it", async () => {
    expect(await suggestTag(ALICE, { tag_id: "Ocean" })).toEqual({
      ok: true,
      value: { tag: { tag_id: "ocean" }, created: false },
    });
    expect(tagsTable.suggest).not.toHaveBeenCalled();
  });

  test("refuses a visitor who isn't logged in", async () => {
    expect(await suggestTag(null, { tag_id: "sea-ice" })).toMatchObject({
      error: "unauthenticated",
    });
  });

  test.each(["sea_ice", "sea.ice", "a".repeat(41), "", "--"])(
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
    expect(await suggestTag(ALICE, { tag_id: "sea-ice" })).toMatchObject({
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

  test("only admins may decide", async () => {
    (isAdmin as jest.Mock).mockReturnValue(false);
    expect(await updateTag(ALICE, "sst", { pending: false })).toMatchObject({
      error: "forbidden",
    });
    expect(await deleteTag(null, "sst", {})).toMatchObject({
      error: "unauthenticated",
    });
    expect(await listTags(ALICE, { reviewed: "true" })).toMatchObject({
      error: "forbidden",
    });
    expect(tagsTable.decide).not.toHaveBeenCalled();
  });

  test("approving records the decision, keeps who suggested, and repeats harmlessly", async () => {
    const result = await updateTag(ALICE, "sst", { pending: false });
    expect(result).toEqual({
      ok: true,
      value: {
        tag_id: "sst",
        suggested_by: "alice",
        suggested_at: "2026-10-26T00:00:00.000Z",
        outcome: "approved",
        reviewed_by: "alice",
        reviewed_at: expect.any(String),
      },
    });
    expect(tagsTable.decide).toHaveBeenCalledWith("sst", {
      outcome: "approved",
      reviewed_by: "alice",
    });
    expect(productsTable.setTags).not.toHaveBeenCalled();

    await updateTag(ALICE, "ocean", { pending: false });
    expect(tagsTable.decide).toHaveBeenCalledTimes(1);
  });

  test("approving a tag that doesn't exist is not found", async () => {
    expect(await updateTag(ALICE, "nope", { pending: false })).toMatchObject({
      error: "not_found",
    });
  });

  test("merging records what it changed, then swaps the tag on each product", async () => {
    const result = await deleteTag(ALICE, "sst", { replace_with: ["ocean"] });
    expect(result).toMatchObject({
      ok: true,
      value: { tag_id: "sst", outcome: "merged", merged_into: ["ocean"] },
    });
    expect(tagsTable.decide).toHaveBeenCalledWith("sst", {
      outcome: "merged",
      reviewed_by: "alice",
      merged_into: ["ocean"],
      // p1 had ocean already, so the merge added nothing there.
      changed: [
        { account_id: "a", product_id: "p1", added: [] },
        { account_id: "b", product_id: "p2", added: ["ocean"] },
      ],
    });
    expect(productsTable.setTags).toHaveBeenCalledWith("a", "p1", ["ocean"]);
    expect(productsTable.setTags).toHaveBeenCalledWith("b", "p2", ["climate", "ocean"]);
  });

  test("merging into several tags puts each in its place, once", async () => {
    await deleteTag(ALICE, "sst", { replace_with: ["ocean", "climate", "ocean"] });
    expect(productsTable.setTags).toHaveBeenCalledWith("a", "p1", ["ocean", "climate"]);
    expect(productsTable.setTags).toHaveBeenCalledWith("b", "p2", ["climate", "ocean"]);
  });

  test.each([["made-up"], ["sst"], [""], ["ocean", "made-up"]])(
    "merging refuses %p, which has a tag that isn't approved",
    async (...replace_with) => {
      expect(await deleteTag(ALICE, "sst", { replace_with })).toMatchObject({
        error: "invalid",
        fieldErrors: { replace_with: expect.any(Array) },
      });
      expect(tagsTable.decide).not.toHaveBeenCalled();
      expect(productsTable.setTags).not.toHaveBeenCalled();
    }
  );

  test("rejecting records the decision and takes the tag off each product", async () => {
    await deleteTag(ALICE, "sst", {});
    expect(tagsTable.decide).toHaveBeenCalledWith(
      "sst",
      expect.objectContaining({ outcome: "rejected", reviewed_by: "alice" })
    );
    expect(productsTable.setTags).toHaveBeenCalledWith("a", "p1", ["ocean"]);
    expect(productsTable.setTags).toHaveBeenCalledWith("b", "p2", ["climate"]);
  });

  test("a tag another admin decided first changes no product", async () => {
    (tagsTable.decide as jest.Mock).mockResolvedValue(false);
    expect(await deleteTag(ALICE, "sst", {})).toMatchObject({ error: "conflict" });
    expect(productsTable.setTags).not.toHaveBeenCalled();
  });

  test("an approved tag can't be rejected, as from a stale review form", async () => {
    expect(await deleteTag(ALICE, "ocean", {})).toMatchObject({ error: "conflict" });
    expect(tagsTable.decide).not.toHaveBeenCalled();
  });

  test("lists decided tags to admins, most recent first", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue([
      { tag_id: "a", outcome: "rejected", reviewed_at: "2026-10-01T00:00:00Z" },
      { tag_id: "b", outcome: "merged", reviewed_at: "2026-10-03T00:00:00Z" },
      { tag_id: "ocean" },
      pending("sst"),
    ]);
    const result = await listTags(ALICE, { reviewed: "true" });
    expect(result.ok && result.value.items.map((t) => t.tag_id)).toEqual(["b", "a"]);
  });
});

describe("undoing a decision", () => {
  const decided = (overrides: Record<string, unknown>) => ({
    tag_id: "sst",
    suggested_by: "alice",
    suggested_at: "2026-10-26T00:00:00.000Z",
    reviewed_by: "root",
    reviewed_at: "2026-10-27T00:00:00.000Z",
    ...overrides,
  });

  beforeEach(() => (isAdmin as jest.Mock).mockReturnValue(true));

  test("a merge puts the tag back and takes off only what it added", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue([
      decided({
        outcome: "merged",
        merged_into: ["ocean"],
        changed: [
          { account_id: "a", product_id: "p1", added: [] },
          { account_id: "b", product_id: "p2", added: ["ocean"] },
          { account_id: "c", product_id: "gone", added: ["ocean"] },
        ],
      }),
    ]);
    (productsTable.fetchById as jest.Mock).mockImplementation(async (_a, id) =>
      id === "gone"
        ? null
        : { metadata: { tags: id === "p1" ? ["ocean"] : ["climate", "ocean"] } }
    );

    expect(await updateTag(ALICE, "sst", { pending: true })).toEqual({
      ok: true,
      value: {
        tag_id: "sst",
        pending: true,
        suggested_by: "alice",
        suggested_at: "2026-10-26T00:00:00.000Z",
      },
    });
    // p1 had ocean before the merge, so it keeps it.
    expect(productsTable.setTags).toHaveBeenCalledWith("a", "p1", ["ocean", "sst"]);
    expect(productsTable.setTags).toHaveBeenCalledWith("b", "p2", ["climate", "sst"]);
    expect(productsTable.setTags).toHaveBeenCalledTimes(2);
    expect(tagsTable.reopen).toHaveBeenCalledWith("sst");
  });

  test("an approval only reopens the tag", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue([decided({ outcome: "approved" })]);
    expect(await updateTag(ALICE, "sst", { pending: true })).toMatchObject({ ok: true });
    expect(productsTable.setTags).not.toHaveBeenCalled();
    expect(tagsTable.reopen).toHaveBeenCalledWith("sst");
  });

  test("a tag nobody suggested has no decision to undo", async () => {
    expect(await updateTag(ALICE, "ocean", { pending: true })).toMatchObject({
      error: "conflict",
    });
    expect(tagsTable.reopen).not.toHaveBeenCalled();
  });

  test("a merged or rejected tag can't be approved until it is undone", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue([decided({ outcome: "rejected" })]);
    expect(await updateTag(ALICE, "sst", { pending: false })).toMatchObject({
      error: "conflict",
    });
    expect(tagsTable.decide).not.toHaveBeenCalled();
  });

  test("suggesting a rejected tag again puts it back in the queue", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue([decided({ outcome: "rejected" })]);
    expect(await suggestTag(ALICE, { tag_id: "sst" })).toMatchObject({
      ok: true,
      value: { created: true },
    });
    expect(tagsTable.suggest).toHaveBeenCalledWith("sst", "alice");
  });
});
