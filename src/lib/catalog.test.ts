import { parseCatalog } from "./catalog";

const entry = { account_id: "org", product_id: "data", total_bytes: 1024, object_count: 2, exts: { tif: 2 } };

it("indexes products by account and product, ignoring unrelated catalog fields", () => {
  const catalog = parseCatalog([
    JSON.stringify({ ...entry, description: "Not retained" }),
    JSON.stringify({ ...entry, account_id: "other" }),
  ].join("\r\n"));
  expect(catalog.size).toBe(2);
  expect(catalog.get("org/data")).toEqual(entry);
  expect(catalog.get("missing/data")).toBeUndefined();
});

it("skips malformed lines and invalid identities without losing valid entries", () => {
  expect(parseCatalog(`\nnull\n{bad json\n{}\n${JSON.stringify(entry)}\n`).size).toBe(1);
});

it("omits invalid statistics and preserves zero values", () => {
  const catalog = parseCatalog(JSON.stringify({ ...entry, total_bytes: -1, object_count: 0, exts: [] }));
  expect(catalog.get("org/data")).toEqual({ account_id: "org", product_id: "data", object_count: 0 });
});

it("omits the whole extension map if any count is invalid", () => {
  const catalog = parseCatalog(JSON.stringify({
    ...entry,
    exts: { tif: 2, csv: -1 },
  }));
  expect(catalog.get("org/data")).toEqual({
    account_id: "org",
    product_id: "data",
    total_bytes: 1024,
    object_count: 2,
  });
});

it("retains per-extension byte totals, including zero and extensionless files", () => {
  const record = { ...entry, ext_bytes: { tif: 1024, "": 50, csv: 0 } };
  expect(parseCatalog(JSON.stringify(record)).get("org/data")).toEqual(record);
});

it("omits invalid per-extension byte totals without dropping file counts", () => {
  const record = { ...entry, ext_bytes: { tif: -1 } };
  expect(parseCatalog(JSON.stringify(record)).get("org/data")).toEqual(entry);
});

it("uses the last valid whole-product record for duplicate product keys", () => {
  const replacement = { ...entry, object_count: 3 };
  const catalog = parseCatalog([
    JSON.stringify(entry),
    JSON.stringify(replacement),
    JSON.stringify({ ...entry, account_id: null }),
  ].join("\n"));
  expect(catalog.size).toBe(1);
  expect(catalog.get("org/data")).toEqual(replacement);
});

it("does not substitute child dataset statistics for whole-product totals", () => {
  const child = { ...entry, id: "org/data/child", object_count: 1 };
  const parent = { ...entry, id: "org/data" };
  expect(parseCatalog(JSON.stringify(child)).size).toBe(0);
  for (const records of [[parent, child], [child, parent]]) {
    expect(parseCatalog(records.map((record) => JSON.stringify(record)).join("\n")))
      .toEqual(new Map([["org/data", parent]]));
  }
});

it("shares successful requests and retries after HTTP failures", async () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(entry) });
  global.fetch = fetchMock;
  try {
    const { loadCatalog, CATALOG_URL } = await import("./catalog");
    const failed = loadCatalog();
    expect(loadCatalog()).toBe(failed);
    await expect(failed).rejects.toThrow("503");
    const successful = loadCatalog();
    expect(loadCatalog()).toBe(successful);
    expect((await successful).get("org/data")).toEqual(entry);
    await loadCatalog();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(CATALOG_URL);
  } finally {
    global.fetch = originalFetch;
  }
});
