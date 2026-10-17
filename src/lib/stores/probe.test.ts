/** @jest-environment node */

import { probeStore } from "./probe";
import type { S3StorageClient } from "@/lib/storage/s3";

const json = (v: unknown) => Buffer.from(JSON.stringify(v));

const ICECHUNK_MAGIC = Buffer.from([
  0x49, 0x43, 0x45, 0xf0, 0x9f, 0xa7, 0x8a, 0x43, 0x48, 0x55, 0x4e, 0x4b,
]);

const notFound = () => Object.assign(new Error("NotFound"), { name: "NotFound" });

/**
 * Minimal fake storage client. `objects` is keyed by object_path (relative to
 * the product, i.e. `${storePath}/${rel}`); `dirs` is keyed by the full
 * ListObjectsV2 prefix `${product_id}/${storePath}/...`.
 */
function fakeS3(
  objects: Record<string, Buffer>,
  dirs: Record<string, string[]> = {},
): S3StorageClient {
  return {
    getObject: jest.fn(async ({ object_path }: { object_path: string }) => {
      const data = objects[object_path];
      if (!data) throw notFound();
      return { data } as never;
    }),
    headObject: jest.fn(async ({ object_path }: { object_path: string }) => {
      if (!(object_path in objects)) throw notFound();
      return {} as never;
    }),
    listObjects: jest.fn(async ({ prefix }: { prefix: string }) => {
      return { objects: [], directories: dirs[prefix] ?? [], isTruncated: false } as never;
    }),
  } as unknown as S3StorageClient;
}

const base = { account_id: "acct", product_id: "prod" };

describe("probeStore — Zarr v2 (consolidated .zmetadata)", () => {
  const meta = (extra: Record<string, unknown> = {}) => ({
    zarr_consolidated_format: 1,
    metadata: {
      ".zgroup": { zarr_format: 2 },
      "temp/.zarray": {
        shape: [4, 4],
        chunks: [2, 2],
        dtype: "<f4",
        dimension_separator: ".",
        compressor: null,
        ...extra,
      },
    },
  });

  it("is renderable and reports chunkCanary 'ok' when the first chunk exists", async () => {
    const s3 = fakeS3({
      "d.zarr/.zmetadata": json(meta()),
      "d.zarr/temp/0.0": Buffer.from([1, 2, 3]),
    });
    const r = await probeStore({ ...base, s3, storePath: "d.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "zarr2", chunkCanary: "ok" });
  });

  it("stays renderable but 'inconclusive' when the first chunk 404s (fill value)", async () => {
    const s3 = fakeS3({ "d.zarr/.zmetadata": json(meta()) });
    const r = await probeStore({ ...base, s3, storePath: "d.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "zarr2", chunkCanary: "inconclusive" });
  });

  it("is not renderable when the only array is missing shape/chunks", async () => {
    const s3 = fakeS3({
      "d.zarr/.zmetadata": json({
        metadata: { "temp/.zarray": { dtype: "<f4" } },
      }),
    });
    const r = await probeStore({ ...base, s3, storePath: "d.zarr", extension: "zarr" });
    expect(r.renderable).toBe(false);
  });
});

describe("probeStore — Zarr v3 (zarr.json)", () => {
  const v3Array = {
    zarr_format: 3,
    node_type: "array",
    shape: [3],
    data_type: "float32",
    chunk_grid: { name: "regular", configuration: { chunk_shape: [3] } },
    chunk_key_encoding: { name: "default", configuration: { separator: "/" } },
  };

  it("is renderable when the root is a valid array", async () => {
    const s3 = fakeS3({ "f.zarr/zarr.json": json(v3Array), "f.zarr/c/0": Buffer.from([9]) });
    const r = await probeStore({ ...base, s3, storePath: "f.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "zarr3", chunkCanary: "ok" });
  });

  it("discovers a child array under a v3 group via listing", async () => {
    const s3 = fakeS3(
      {
        "g.zarr/zarr.json": json({ zarr_format: 3, node_type: "group" }),
        "g.zarr/temp/zarr.json": json({ ...v3Array, shape: [2] }),
      },
      { "prod/g.zarr/": ["prod/g.zarr/temp/"] },
    );
    const r = await probeStore({ ...base, s3, storePath: "g.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "zarr3" });
  });

  it("is not renderable for a group with no arrays", async () => {
    const s3 = fakeS3({ "g.zarr/zarr.json": json({ zarr_format: 3, node_type: "group" }) });
    const r = await probeStore({ ...base, s3, storePath: "g.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: false, format: "zarr3" });
  });
});

describe("probeStore — Zarr v2 (non-consolidated .zgroup)", () => {
  it("discovers a child .zarray via listing", async () => {
    const s3 = fakeS3(
      {
        "h.zarr/.zgroup": Buffer.from("{}"),
        "h.zarr/arr/.zarray": json({ shape: [2], chunks: [2], dtype: "<i4" }),
      },
      { "prod/h.zarr/": ["prod/h.zarr/arr/"] },
    );
    const r = await probeStore({ ...base, s3, storePath: "h.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "zarr2" });
  });
});

describe("probeStore — Zarr v2 (bare root array, no .zgroup/.zmetadata)", () => {
  // A single-array store where the root *is* the array: `.zarray` at the root,
  // no `.zgroup` and no consolidated `.zmetadata` (e.g. zarr.save_array). Mirrors
  // the v3 "root itself is an array" case.
  it("is renderable when the store root itself is a .zarray", async () => {
    const s3 = fakeS3({
      "r.zarr/.zarray": json({
        shape: [4, 4],
        chunks: [2, 2],
        dtype: "<f4",
        dimension_separator: ".",
      }),
      "r.zarr/0.0": Buffer.from([1, 2, 3]),
    });
    const r = await probeStore({ ...base, s3, storePath: "r.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "zarr2", chunkCanary: "ok" });
  });

  it("stays 'inconclusive' when the root array's first chunk 404s", async () => {
    const s3 = fakeS3({
      "r.zarr/.zarray": json({ shape: [2], chunks: [2], dtype: "<i4" }),
    });
    const r = await probeStore({ ...base, s3, storePath: "r.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "zarr2", chunkCanary: "inconclusive" });
  });
});

describe("probeStore — OME-NGFF detection", () => {
  const channelAxes = [
    { name: "c", type: "channel" },
    { name: "z", type: "space", unit: "micrometer" },
    { name: "y", type: "space", unit: "micrometer" },
    { name: "x", type: "space", unit: "micrometer" },
  ];
  const spatialOnlyAxes = [
    { name: "y", type: "space" },
    { name: "x", type: "space" },
  ];
  const array2d = { shape: [100, 100], chunks: [50, 50], dtype: "<f4" };

  it("detects OME-NGFF via channel axis in consolidated v2 .zattrs", async () => {
    const s3 = fakeS3({
      "o.zarr/.zmetadata": json({
        zarr_consolidated_format: 1,
        metadata: {
          ".zattrs": { multiscales: [{ version: "0.4", axes: channelAxes }] },
          ".zgroup": { zarr_format: 2 },
          "0/.zarray": { shape: [1, 10, 128, 128], chunks: [1, 10, 128, 128], dtype: "<u2" },
        },
      }),
    });
    const r = await probeStore({ ...base, s3, storePath: "o.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "ome-ngff" });
  });

  it("detects OME-NGFF via legacy axis name 'c' without explicit type", async () => {
    const s3 = fakeS3({
      "o.zarr/.zmetadata": json({
        zarr_consolidated_format: 1,
        metadata: {
          ".zattrs": { multiscales: [{ axes: [{ name: "c" }, { name: "z" }, { name: "y" }, { name: "x" }] }] },
          ".zgroup": { zarr_format: 2 },
          "0/.zarray": { shape: [1, 10, 128, 128], chunks: [1, 10, 128, 128], dtype: "<u2" },
        },
      }),
    });
    const r = await probeStore({ ...base, s3, storePath: "o.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "ome-ngff" });
  });

  it("does not detect OME-NGFF for spatial-only multiscales (geospatial store)", async () => {
    const s3 = fakeS3({
      "g.zarr/.zmetadata": json({
        zarr_consolidated_format: 1,
        metadata: {
          ".zattrs": { multiscales: [{ axes: spatialOnlyAxes }] },
          ".zgroup": { zarr_format: 2 },
          "0/.zarray": { ...array2d },
        },
      }),
    });
    const r = await probeStore({ ...base, s3, storePath: "g.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "zarr2" });
  });

  it("does not detect OME-NGFF when there is no multiscales metadata", async () => {
    const s3 = fakeS3({
      "p.zarr/.zmetadata": json({
        zarr_consolidated_format: 1,
        metadata: {
          ".zgroup": { zarr_format: 2 },
          "0/.zarray": { ...array2d },
        },
      }),
    });
    const r = await probeStore({ ...base, s3, storePath: "p.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "zarr2" });
  });

  it("detects OME-NGFF via channel axis in .zattrs for non-consolidated v2", async () => {
    const s3 = fakeS3(
      {
        "o.zarr/.zgroup": Buffer.from("{}"),
        "o.zarr/.zattrs": json({ multiscales: [{ axes: channelAxes }] }),
        "o.zarr/0/.zarray": json({ shape: [1, 10, 128, 128], chunks: [1, 10, 128, 128], dtype: "<u2" }),
      },
      { "prod/o.zarr/": ["prod/o.zarr/0/"] },
    );
    const r = await probeStore({ ...base, s3, storePath: "o.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "ome-ngff" });
  });

  it("detects OME-NGFF via channel axis in v3 zarr.json attributes (v0.4 style)", async () => {
    const s3 = fakeS3({
      "o.zarr/zarr.json": json({
        zarr_format: 3,
        node_type: "array",
        shape: [1, 10, 128, 128],
        data_type: "uint16",
        chunk_grid: { name: "regular", configuration: { chunk_shape: [1, 10, 128, 128] } },
        chunk_key_encoding: { name: "default", configuration: { separator: "/" } },
        attributes: { multiscales: [{ axes: channelAxes }] },
      }),
    });
    const r = await probeStore({ ...base, s3, storePath: "o.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "ome-ngff" });
  });

  it("detects OME-NGFF via the 'ome' namespace key in v3 zarr.json attributes (v0.5+)", async () => {
    // Spatial-only annotation volume — no channel axis — but the 'ome' namespace
    // key identifies it as OME-NGFF regardless.
    const spatialAxes = [
      { name: "z", type: "space", unit: "millimeter" },
      { name: "y", type: "space", unit: "millimeter" },
      { name: "x", type: "space", unit: "millimeter" },
    ];
    const s3 = fakeS3(
      {
        "o.zarr/zarr.json": json({
          zarr_format: 3,
          node_type: "group",
          attributes: {
            ome: {
              version: "0.6",
              multiscales: [{ datasets: [{ path: "s0" }], axes: spatialAxes }],
            },
          },
        }),
        "o.zarr/s0/zarr.json": json({
          zarr_format: 3,
          node_type: "array",
          shape: [100, 200, 200],
          data_type: "uint32",
          chunk_grid: { name: "regular", configuration: { chunk_shape: [32, 64, 64] } },
          chunk_key_encoding: { name: "default", configuration: { separator: "/" } },
        }),
      },
      { "prod/o.zarr/": ["prod/o.zarr/s0/"] },
    );
    const r = await probeStore({ ...base, s3, storePath: "o.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: true, format: "ome-ngff" });
  });
});

describe("probeStore — Zarr negatives", () => {
  it("is not renderable when no metadata exists at the root", async () => {
    const s3 = fakeS3({});
    const r = await probeStore({ ...base, s3, storePath: "x.zarr", extension: "zarr" });
    expect(r).toMatchObject({ renderable: false, reason: "no zarr metadata at store root" });
  });

  it("is not renderable when root metadata is invalid JSON", async () => {
    const s3 = fakeS3({ "x.zarr/.zmetadata": Buffer.from("not json {") });
    const r = await probeStore({ ...base, s3, storePath: "x.zarr", extension: "zarr" });
    expect(r.renderable).toBe(false);
  });
});

describe("probeStore — Icechunk", () => {
  it("is renderable via main branch ref + snapshot, magic canary 'ok'", async () => {
    const s3 = fakeS3({
      "s.icechunk/refs/branch.main/ref.json": json({ snapshot: "SNAP1" }),
      "s.icechunk/snapshots/SNAP1": Buffer.concat([ICECHUNK_MAGIC, Buffer.from("body")]),
    });
    const r = await probeStore({ ...base, s3, storePath: "s.icechunk", extension: "icechunk" });
    expect(r).toMatchObject({ renderable: true, format: "icechunk", chunkCanary: "ok" });
    // The canary must Range-read only the magic header, never the whole snapshot.
    expect(s3.getObject).toHaveBeenCalledWith(
      expect.objectContaining({
        object_path: "s.icechunk/snapshots/SNAP1",
        range: `bytes=0-${ICECHUNK_MAGIC.length - 1}`,
      }),
    );
  });

  it("reports 'inconclusive' when the snapshot lacks the magic header", async () => {
    const s3 = fakeS3({
      "s.icechunk/refs/branch.main/ref.json": json({ snapshot: "SNAP1" }),
      "s.icechunk/snapshots/SNAP1": Buffer.from("garbage"),
    });
    const r = await probeStore({ ...base, s3, storePath: "s.icechunk", extension: "icechunk" });
    expect(r).toMatchObject({ renderable: true, chunkCanary: "inconclusive" });
  });

  it("discovers a non-main default branch via listing", async () => {
    const s3 = fakeS3(
      {
        "s.icechunk/refs/branch.dev/ref.json": json({ snapshot: "S2" }),
        "s.icechunk/snapshots/S2": ICECHUNK_MAGIC,
      },
      { "prod/s.icechunk/refs/": ["prod/s.icechunk/refs/branch.dev/"] },
    );
    const r = await probeStore({ ...base, s3, storePath: "s.icechunk", extension: "icechunk" });
    expect(r).toMatchObject({ renderable: true, format: "icechunk" });
  });

  it("is not renderable when the snapshot the ref points at is missing", async () => {
    const s3 = fakeS3({ "s.icechunk/refs/branch.main/ref.json": json({ snapshot: "SNAP1" }) });
    const r = await probeStore({ ...base, s3, storePath: "s.icechunk", extension: "icechunk" });
    expect(r).toMatchObject({ renderable: false, format: "icechunk" });
  });

  it("is not renderable when there is no ref or repo info object", async () => {
    const s3 = fakeS3({});
    const r = await probeStore({ ...base, s3, storePath: "s.icechunk", extension: "icechunk" });
    expect(r).toMatchObject({ renderable: false });
  });
});

describe("probeStore — Icechunk (spec 2.x repo-info layout, no refs/)", () => {
  // Icechunk >=2.x drops the refs/ prefix: branch/tag pointers and config live
  // in a single root `repo` info object that starts with the Icechunk magic
  // header (e.g. "ICE🧊CHUNKic-2.1.1…"). See https://icechunk.io/en/stable/spec/.
  const repoInfo = Buffer.concat([ICECHUNK_MAGIC, Buffer.from("ic-2.1.1\x00rest")]);

  it("is renderable from the root `repo` info object when there is no refs/", async () => {
    const s3 = fakeS3({
      "s.icechunk/repo": repoInfo,
      // Content-addressed snapshot id (no derivable "first" snapshot); presence
      // only. Crucially there is NO refs/branch.main/ref.json here.
      "s.icechunk/snapshots/000XCS6VJBQ56YBKC98G": ICECHUNK_MAGIC,
    });
    const r = await probeStore({ ...base, s3, storePath: "s.icechunk", extension: "icechunk" });
    expect(r).toMatchObject({ renderable: true, format: "icechunk", chunkCanary: "ok" });
    // Tier 1/2 must Range-read only the magic header of the (possibly multi-MB)
    // repo info object, never download it whole.
    expect(s3.getObject).toHaveBeenCalledWith(
      expect.objectContaining({
        object_path: "s.icechunk/repo",
        range: `bytes=0-${ICECHUNK_MAGIC.length - 1}`,
      }),
    );
  });

  it("is not renderable when the root `repo` object lacks the Icechunk magic", async () => {
    const s3 = fakeS3({ "s.icechunk/repo": Buffer.from("not an icechunk repo") });
    const r = await probeStore({ ...base, s3, storePath: "s.icechunk", extension: "icechunk" });
    expect(r.renderable).toBe(false);
  });
});
