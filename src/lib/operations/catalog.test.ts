/** @jest-environment node */
import { productsTable } from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { readEntry, writeEntry } from "@/lib/clients/catalog-repo";
import { updateCatalogEntry } from "./catalog";

jest.mock("@/lib/clients/database", () => ({ productsTable: { fetchById: jest.fn() } }));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));
jest.mock("@/lib/clients/catalog-repo", () => ({ readEntry: jest.fn(), writeEntry: jest.fn() }));
jest.mock("./products", () => ({
  refuse: (session: unknown, _p: unknown, message: string) =>
    session ? { ok: false, error: "forbidden", message } : { ok: false, error: "unauthenticated" },
}));

const SESSION = { account: { account_id: "alice" } } as never;
const FILE = '{\n  "title": "T",\n  "keywords": [\n    "old"\n  ]\n}\n';

beforeEach(() => {
  jest.resetAllMocks();
  (productsTable.fetchById as jest.Mock).mockResolvedValue({ account_id: "a", product_id: "p" });
  (isAuthorized as jest.Mock).mockReturnValue(true);
  (readEntry as jest.Mock).mockResolvedValue({ sha: "s1", text: FILE });
  (writeEntry as jest.Mock).mockResolvedValue(true);
});

const edit = (input: unknown, session = SESSION) => updateCatalogEntry(session, "a", "p", input);

describe("updateCatalogEntry", () => {
  it("commits the new keywords with the edit marked", async () => {
    const result = await edit({ keywords: ["New Zealand", "#new-zealand", "cog"] });
    expect(result).toEqual({
      ok: true,
      value: { account_id: "a", product_id: "p", keywords: ["new-zealand", "cog"] },
    });
    const [path, text, sha] = (writeEntry as jest.Mock).mock.calls[0];
    expect([path, sha]).toEqual(["a/p.json", "s1"]);
    const written = JSON.parse(text);
    expect(written.keywords).toEqual(["new-zealand", "cog"]);
    expect(written._edited).toMatchObject({ by: "alice", fields: ["keywords"] });
    expect(written.title).toBe("T");
  });

  it("writes nothing when the keywords are already these", async () => {
    expect(await edit({ keywords: ["old"] })).toMatchObject({ ok: true });
    expect(writeEntry).not.toHaveBeenCalled();
  });

  it("refuses with the product's own rule", async () => {
    (isAuthorized as jest.Mock).mockReturnValue(false);
    expect(await edit({ keywords: [] })).toMatchObject({ error: "forbidden" });
    expect(await edit({ keywords: [] }, null)).toMatchObject({ error: "unauthenticated" });
    expect(readEntry).not.toHaveBeenCalled();
  });

  it("is not found without a product or a catalog entry", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(null);
    expect(await edit({ keywords: [] })).toMatchObject({ error: "not_found" });
    (productsTable.fetchById as jest.Mock).mockResolvedValue({ account_id: "a" });
    (readEntry as jest.Mock).mockResolvedValue(null);
    expect(await edit({ keywords: [] })).toMatchObject({ error: "not_found" });
  });

  it.each([[{}], [{ keywords: ["no/slash"] }], [{ keywords: Array(31).fill("a") }]])(
    "rejects %j",
    async (input) => {
      expect(await edit(input)).toMatchObject({ ok: false, error: "invalid" });
      expect(writeEntry).not.toHaveBeenCalled();
    }
  );

  it("answers a conflict when the entry moved on", async () => {
    (writeEntry as jest.Mock).mockResolvedValue(false);
    expect(await edit({ keywords: ["x"] })).toMatchObject({ error: "conflict" });
  });
});
