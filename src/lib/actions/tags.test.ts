/** @jest-environment node */
import { productsTable, tagsTable } from "@/lib/clients/database";
import { getPageSession } from "@/lib";
import { isAdmin } from "@/lib/api/authz";
import { reviewTag, suggestTag } from "./tags";

jest.mock("@/lib/clients/database", () => ({
  productsTable: { listByTag: jest.fn(), setTags: jest.fn() },
  tagsTable: {
    listAll: jest.fn(),
    suggest: jest.fn(),
    approve: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("@/lib", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAdmin: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const pending = (tag_id: string, suggested_by = "alice") => ({
  tag_id,
  pending: true,
  suggested_by,
});

beforeEach(() => {
  jest.resetAllMocks();
  (getPageSession as jest.Mock).mockResolvedValue({
    account: { account_id: "alice" },
  });
  (tagsTable.listAll as jest.Mock).mockResolvedValue([
    { tag_id: "ocean" },
    { tag_id: "climate" },
  ]);
});

describe("suggestTag", () => {
  test("normalizes the tag and adds it as pending", async () => {
    expect(await suggestTag("  Sea   Ice ")).toEqual({ tag: "sea ice" });
    expect(tagsTable.suggest).toHaveBeenCalledWith("sea ice", "alice");
  });

  test("returns a tag that already exists without suggesting it", async () => {
    expect(await suggestTag("Ocean")).toEqual({ tag: "ocean" });
    expect(tagsTable.suggest).not.toHaveBeenCalled();
  });

  test("refuses a visitor who isn't logged in", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(null);
    expect(await suggestTag("sea ice")).toHaveProperty("error");
    expect(tagsTable.suggest).not.toHaveBeenCalled();
  });

  test.each(["#seaice", "-ice", "a".repeat(41), ""])(
    "refuses the malformed tag %p",
    async (raw) => {
      expect(await suggestTag(raw)).toHaveProperty("error");
      expect(tagsTable.suggest).not.toHaveBeenCalled();
    }
  );

  test("refuses a sixth pending suggestion from one person", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue([
      ...["a1", "a2", "a3", "a4", "a5"].map((t) => pending(t)),
      pending("b1", "bob"),
    ]);
    expect(await suggestTag("sea ice")).toHaveProperty("error");
    expect(tagsTable.suggest).not.toHaveBeenCalled();
  });
});

describe("reviewTag", () => {
  const review = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return reviewTag(fd);
  };

  beforeEach(() => {
    (isAdmin as jest.Mock).mockReturnValue(true);
    (productsTable.listByTag as jest.Mock).mockResolvedValue([
      { account_id: "a", product_id: "p1", metadata: { tags: ["sst", "ocean"] } },
      { account_id: "b", product_id: "p2", metadata: { tags: ["climate", "sst"] } },
    ]);
  });

  test("refuses anyone but an admin", async () => {
    (isAdmin as jest.Mock).mockReturnValue(false);
    await expect(review({ tag: "sst", decision: "approve" })).rejects.toThrow();
    expect(tagsTable.approve).not.toHaveBeenCalled();
  });

  test("approve keeps the tag on its products", async () => {
    await review({ tag: "sst", decision: "approve" });
    expect(tagsTable.approve).toHaveBeenCalledWith("sst");
    expect(productsTable.setTags).not.toHaveBeenCalled();
  });

  test("merge swaps the tag on each product, without duplicates", async () => {
    await review({ tag: "sst", decision: "merge", into: "ocean" });
    expect(productsTable.setTags).toHaveBeenCalledWith("a", "p1", ["ocean"]);
    expect(productsTable.setTags).toHaveBeenCalledWith("b", "p2", [
      "climate",
      "ocean",
    ]);
    expect(tagsTable.delete).toHaveBeenCalledWith("sst");
  });

  test("merge refuses a target that isn't an approved tag", async () => {
    await expect(
      review({ tag: "sst", decision: "merge", into: "made-up" })
    ).rejects.toThrow();
    expect(productsTable.setTags).not.toHaveBeenCalled();
    expect(tagsTable.delete).not.toHaveBeenCalled();
  });

  test("reject takes the tag off each product and deletes it", async () => {
    await review({ tag: "sst", decision: "reject" });
    expect(productsTable.setTags).toHaveBeenCalledWith("a", "p1", ["ocean"]);
    expect(productsTable.setTags).toHaveBeenCalledWith("b", "p2", ["climate"]);
    expect(tagsTable.delete).toHaveBeenCalledWith("sst");
  });
});
