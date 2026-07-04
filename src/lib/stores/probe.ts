import "server-only";

import { LOGGER } from "@/lib/logging";
import { withTimeout } from "@/lib/with-timeout";
import type { S3StorageClient } from "@/lib/storage/s3";

/**
 * Cheap, tiered pre-checks that decide whether a `.zarr` / `.icechunk` store is
 * worth handing to the embedded zarr-viewer. We only embed the external iframe
 * when the store is actually renderable, so a broken/empty/mislabeled prefix
 * doesn't produce a viewer that just spins or errors.
 *
 * Tiers:
 *   1. Structure exists  — a few HEAD/GET requests confirm it's a Zarr v2, Zarr
 *      v3, or Icechunk store at all.
 *   2. Metadata is valid — parse what tier 1 fetched: valid JSON, a supported
 *      format, and at least one *array* (not just groups) declaring shape/chunks/
 *      dtype.
 *   3. One chunk is readable — a best-effort canary. NON-BLOCKING: an ambiguous
 *      404 (legit fill-value, sharded array, or Icechunk's content-addressed
 *      chunk ids) never hides an otherwise-valid store.
 *
 * `renderable` is `tier1 && tier2`. Every probe is wrapped so it can never throw
 * — an infra failure/timeout yields `renderable:false` (fail-closed), and the
 * caller still shows the normal directory listing.
 */

export type StoreFormat = "zarr2" | "zarr3" | "icechunk";

export interface StoreProbe {
  renderable: boolean;
  format?: StoreFormat;
  /** Tier 3 outcome. Informational only — does not affect `renderable`. */
  chunkCanary?: "ok" | "inconclusive";
  /** Why it isn't renderable (or a note); logged, not shown to users. */
  reason?: string;
}

export interface ProbeStoreArgs {
  s3: S3StorageClient;
  account_id: string;
  product_id: string;
  /** Store prefix relative to the product, e.g. `gfs.icechunk` or `a/b.zarr`. */
  storePath: string;
  /** Lowercased suffix: `zarr` or `icechunk`. */
  extension: string;
}

// Per-request budget for a single HEAD/GET against the data proxy.
const PROBE_TIMEOUT_MS = 4000;

// Leading bytes of every Icechunk snapshot/manifest file: UTF-8 "ICE🧊CHUNK".
const ICECHUNK_MAGIC = Buffer.from([
  0x49, 0x43, 0x45, 0xf0, 0x9f, 0xa7, 0x8a, 0x43, 0x48, 0x55, 0x4e, 0x4b,
]);

export async function probeStore(args: ProbeStoreArgs): Promise<StoreProbe> {
  try {
    if (args.extension === "icechunk") {
      return await probeIcechunk(args);
    }
    if (args.extension === "zarr") {
      return await probeZarr(args);
    }
    return { renderable: false, reason: `unsupported extension: ${args.extension}` };
  } catch (error) {
    // Defensive: any unexpected throw fails closed rather than blowing up render.
    LOGGER.warn("Store probe threw unexpectedly", {
      operation: "probeStore",
      context: "store validation",
      metadata: { ...pick(args), error: String(error) },
    });
    return { renderable: false, reason: "probe error" };
  }
}

// ── I/O helpers (never throw) ──────────────────────────────────────────────

type Io = Pick<ProbeStoreArgs, "s3" | "account_id" | "product_id" | "storePath">;

const join = (storePath: string, rel: string) => `${storePath}/${rel}`;

/** GET + JSON.parse an object relative to the store root. null on any failure. */
async function getJson(io: Io, rel: string): Promise<unknown | null> {
  const buf = await getBytes(io, rel);
  if (!buf) return null;
  try {
    return JSON.parse(buf.toString("utf-8"));
  } catch {
    return null;
  }
}

/** GET raw bytes of an object relative to the store root. null on any failure. */
async function getBytes(io: Io, rel: string): Promise<Buffer | null> {
  try {
    const res = await withTimeout(
      io.s3.getObject({
        account_id: io.account_id,
        product_id: io.product_id,
        object_path: join(io.storePath, rel),
      }),
      PROBE_TIMEOUT_MS,
      "store probe GET timed out",
    );
    return res.data instanceof Buffer ? res.data : null;
  } catch {
    return null;
  }
}

/** HEAD an object relative to the store root. true iff it exists. */
async function headOk(io: Io, rel: string): Promise<boolean> {
  try {
    await withTimeout(
      io.s3.headObject({
        account_id: io.account_id,
        product_id: io.product_id,
        object_path: join(io.storePath, rel),
      }),
      PROBE_TIMEOUT_MS,
      "store probe HEAD timed out",
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * List immediate children of the store (one delimiter level). Returns child
 * names relative to the store root (no product prefix, no trailing slash).
 */
async function listChildren(io: Io, rel = ""): Promise<string[]> {
  const prefix = `${io.product_id}/${io.storePath}/${rel ? `${rel}/` : ""}`;
  try {
    const res = await withTimeout(
      io.s3.listObjects({ bucket: io.account_id, prefix, delimiter: "/", maxKeys: 100 }),
      PROBE_TIMEOUT_MS,
      "store probe LIST timed out",
    );
    return res.directories.map((d) =>
      d.slice(prefix.length).replace(/\/$/, ""),
    ).filter(Boolean);
  } catch {
    return [];
  }
}

// ── Zarr ────────────────────────────────────────────────────────────────────

interface ArrayHit {
  path: string; // array path relative to store root ("" = root array)
  version: 2 | 3;
  meta: Record<string, unknown>;
}

async function probeZarr(args: ProbeStoreArgs): Promise<StoreProbe> {
  const io: Io = args;

  // Tier 1/2a: Zarr v2 consolidated metadata — one GET yields every node's meta.
  const consolidated = await getJson(io, ".zmetadata");
  const fromConsolidated = consolidated
    ? findArrayInConsolidated(consolidated)
    : null;
  if (fromConsolidated) {
    return finishZarr(io, "zarr2", fromConsolidated);
  }

  // Tier 1/2b: Zarr v3 root.
  const rootV3 = await getJson(io, "zarr.json");
  if (rootV3 && isObject(rootV3) && rootV3.zarr_format === 3) {
    const hit = await findArrayV3(io, rootV3);
    if (hit) return finishZarr(io, "zarr3", hit);
    return { renderable: false, format: "zarr3", reason: "v3 store has no arrays" };
  }

  // Tier 1/2c: Zarr v2 group without consolidated metadata → discover a child array.
  if (await headOk(io, ".zgroup")) {
    const hit = await findArrayV2ByListing(io);
    if (hit) return finishZarr(io, "zarr2", hit);
    return { renderable: false, format: "zarr2", reason: "v2 group has no arrays" };
  }

  return { renderable: false, reason: "no zarr metadata at store root" };
}

/** Validate + attach the Tier-3 chunk canary, then return a renderable probe. */
async function finishZarr(
  io: Io,
  format: "zarr2" | "zarr3",
  hit: ArrayHit,
): Promise<StoreProbe> {
  const chunkCanary = await zarrChunkCanary(io, hit);
  return { renderable: true, format, chunkCanary };
}

function findArrayInConsolidated(consolidated: unknown): ArrayHit | null {
  if (!isObject(consolidated)) return null;
  const meta = isObject(consolidated.metadata) ? consolidated.metadata : consolidated;
  for (const [key, value] of Object.entries(meta)) {
    if (!key.endsWith(".zarray")) continue;
    const arr = asObject(value);
    if (arr && isValidV2Array(arr)) {
      return { path: key.slice(0, -".zarray".length).replace(/\/$/, ""), version: 2, meta: arr };
    }
  }
  return null;
}

async function findArrayV3(io: Io, root: Record<string, unknown>): Promise<ArrayHit | null> {
  // Root itself is an array.
  if (root.node_type === "array" && isValidV3Array(root)) {
    return { path: "", version: 3, meta: root };
  }
  // Consolidated v3 metadata inlined on the group.
  const consolidated = asObject(root.consolidated_metadata);
  const inlined = consolidated && asObject(consolidated.metadata);
  if (inlined) {
    for (const [key, value] of Object.entries(inlined)) {
      const arr = asObject(value);
      if (arr && arr.node_type === "array" && isValidV3Array(arr)) {
        return { path: key.replace(/\/$/, ""), version: 3, meta: arr };
      }
    }
  }
  // Otherwise walk one level of children looking for an array.
  for (const child of await listChildren(io)) {
    const childMeta = await getJson(io, `${child}/zarr.json`);
    if (isObject(childMeta) && childMeta.node_type === "array" && isValidV3Array(childMeta)) {
      return { path: child, version: 3, meta: childMeta };
    }
  }
  return null;
}

async function findArrayV2ByListing(io: Io): Promise<ArrayHit | null> {
  for (const child of await listChildren(io)) {
    const childMeta = await getJson(io, `${child}/.zarray`);
    if (isObject(childMeta) && isValidV2Array(childMeta)) {
      return { path: child, version: 2, meta: childMeta };
    }
  }
  return null;
}

function isValidV2Array(m: Record<string, unknown>): boolean {
  return (
    Array.isArray(m.shape) &&
    Array.isArray(m.chunks) &&
    typeof m.dtype === "string"
  );
}

function isValidV3Array(m: Record<string, unknown>): boolean {
  const grid = asObject(m.chunk_grid);
  const gridConf = grid && asObject(grid.configuration);
  return (
    Array.isArray(m.shape) &&
    typeof m.data_type === "string" &&
    !!gridConf &&
    Array.isArray(gridConf.chunk_shape)
  );
}

/**
 * Tier 3 (non-blocking): try to HEAD the first chunk of the chosen array. A 200
 * confirms data is really there; a 404 is inconclusive (fill-value, sharded
 * array, or an encoding we didn't reconstruct) and never blocks rendering.
 */
async function zarrChunkCanary(io: Io, hit: ArrayHit): Promise<"ok" | "inconclusive"> {
  const key = hit.version === 2 ? firstChunkKeyV2(hit.meta) : firstChunkKeyV3(hit.meta);
  if (key === null) return "inconclusive";
  const rel = hit.path ? `${hit.path}/${key}` : key;
  return (await headOk(io, rel)) ? "ok" : "inconclusive";
}

function firstChunkKeyV2(meta: Record<string, unknown>): string | null {
  const shape = meta.shape;
  if (!Array.isArray(shape)) return null;
  const sep = typeof meta.dimension_separator === "string" ? meta.dimension_separator : ".";
  return shape.length === 0 ? "0" : shape.map(() => "0").join(sep);
}

function firstChunkKeyV3(meta: Record<string, unknown>): string | null {
  const shape = meta.shape;
  if (!Array.isArray(shape)) return null;
  const enc = asObject(meta.chunk_key_encoding);
  const conf = enc && asObject(enc.configuration);
  const sep = conf && typeof conf.separator === "string" ? conf.separator : "/";
  const zeros = shape.map(() => "0");
  // `default` encoding prefixes chunk keys with "c"; `v2` encoding does not.
  if (enc && enc.name === "v2") {
    return zeros.length === 0 ? "0" : zeros.join(sep);
  }
  return ["c", ...zeros].join(sep);
}

// ── Icechunk ─────────────────────────────────────────────────────────────────

async function probeIcechunk(args: ProbeStoreArgs): Promise<StoreProbe> {
  const io: Io = args;

  // Tier 1: the branch ref points at the current snapshot. main is the default;
  // fall back to discovering any branch under refs/ if it's named differently.
  let ref = await getJson(io, "refs/branch.main/ref.json");
  if (!isObject(ref)) {
    const branches = await listChildren(io, "refs");
    const branch = branches.find((b) => b.startsWith("branch."));
    if (branch) ref = await getJson(io, `refs/${branch}/ref.json`);
  }
  if (!isObject(ref) || typeof ref.snapshot !== "string" || !ref.snapshot) {
    return { renderable: false, reason: "no icechunk branch ref" };
  }

  // Tier 2: the snapshot the ref points at must exist.
  const snapshotRel = `snapshots/${ref.snapshot}`;
  if (!(await headOk(io, snapshotRel))) {
    return { renderable: false, format: "icechunk", reason: "icechunk snapshot missing" };
  }

  // Tier 3 (non-blocking): the snapshot blob should be non-empty and carry the
  // Icechunk magic header. Per-chunk canaries aren't feasible — chunk ids are
  // content-addressed, so there's no derivable "first chunk".
  const snapshot = await getBytes(io, snapshotRel);
  const chunkCanary =
    snapshot && snapshot.length > 0 && snapshot.subarray(0, ICECHUNK_MAGIC.length).equals(ICECHUNK_MAGIC)
      ? "ok"
      : "inconclusive";

  return { renderable: true, format: "icechunk", chunkCanary };
}

// ── small utilities ──────────────────────────────────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Consolidated metadata values are usually parsed objects but occasionally
 * JSON strings; accept either. */
function asObject(v: unknown): Record<string, unknown> | null {
  if (isObject(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return isObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

const pick = (a: ProbeStoreArgs) => ({
  account_id: a.account_id,
  product_id: a.product_id,
  storePath: a.storePath,
  extension: a.extension,
});
