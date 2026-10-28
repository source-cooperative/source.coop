#!/usr/bin/env tsx
/**
 * Clean the free-text tags products carry and build the tag corpus from them.
 *
 * Each tag is lowercased, stripped of `#`, split if it holds several tags, its
 * spaces turned into hyphens (`new zealand` is `new-zealand`), and mapped
 * through ALIASES to its canonical form (or dropped). A canonical tag
 * joins the corpus when at least MIN_USES products carry it, or when it is in
 * KEEP. Each product then keeps only its cleaned tags that made the corpus,
 * plus any suggested tag still pending or approved, which it leaves alone.
 * Each corpus tag is written with its category from BY_CATEGORY, and applying
 * deletes imported tags the corpus no longer has from the tags table.
 *
 * Usage:
 *   npx tsx scripts/clean-tags.ts <stage>               # preview from DynamoDB
 *   APPLY=1 npx tsx scripts/clean-tags.ts <stage>       # rewrite products, sync the tags table
 *   npx tsx scripts/clean-tags.ts --counts <file>       # preview from `uniq -c` output
 *   TABLE=1 npx tsx scripts/clean-tags.ts --counts <file>  # ...plus a before/after table
 *
 * Environment variables:
 *   AWS_REGION  - AWS region (default: us-east-1; production is us-west-2)
 *   AWS_PROFILE - AWS profile to use (optional)
 *   APPLY       - Set (to anything) to write; otherwise nothing is written
 */

import { readFileSync } from "node:fs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { canonTag } from "../src/lib/tags/canon";
import { TAG_CATEGORIES, type TagCategory } from "../src/lib/tags/categories";

const MIN_USES = 2;

const FIBOA = ["fiboa", "field", "boundary", "geoparquet", "vector", "pmtiles"];

/**
 * Raw tag → canonical tags. An empty list drops the tag. Keys and tags are
 * written with spaces for reading, and go through canonTag like every tag, so
 * a tag typed either way matches them.
 */
const ALIASES: Record<string, string[]> = {
  // Noise: true of every product on Source, placeholders, or tests.
  "": [], "--": [], geospatial: [], "geo spatial": [], dataset: [], data: [],
  misc: [], test: [], foo: [], testrepo12: [], "test unidata netcdf": [],
  static: [], years: [], source: [], opendata: [], "open data": [],
  public: [], "public-data": [], aws: [], "2024": [], rgb: [], aois: [],
  tabaqat: [], cbam: [], euhvd: [], analysis: [], metadata: [], land: [],
  earth: [], polygon: [], image: [], state: [], county: [],
  countries: [], arc: [], amx: [], sfer: [], sax: [], hcat: [],
  lowcoder: [], lacuna: [], wadhwaniai: [], pacificspatial: [],

  // Spelling, plurals and synonyms.
  "field boundaries": ["field", "boundary"],
  "field boundary": ["field", "boundary"],
  fieldboundaries: ["field", "boundary"],
  "field boundarie": ["field", "boundary"],
  boundary: ["field", "boundary"],
  ftw: ["fields of the world"],
  fieldsoftheworld: ["fields of the world"],
  sentinel: ["sentinel-2"],
  sentinel2: ["sentinel-2"],
  "sentinel2 mosaics cloud-free global cog raster": ["sentinel-2", "global", "cog", "raster"],
  "cloud optimised geotiff": ["cog"],
  tif: ["raster"],
  tiff: ["raster"],
  "pmtiles flatgeobuf": ["pmtiles", "flatgeobuf"],
  "pmtiles gtfs": ["pmtiles", "transportation"],
  "stac-geoparquet": ["stac", "geoparquet"],
  "cloud-native": ["cloud native"],
  cng: ["cloud native"],
  ml: ["machine learning"],
  "deep learning": ["machine learning"],
  "self-supervised": ["machine learning"],
  xai: ["machine learning"],
  "foundational model": ["foundation model"],
  croptype: ["crop type"],
  cdl: ["crop type", "united states"],
  maize: ["crop"],
  wheat: ["crop"],
  cotton: ["crop"],
  farmland: ["agriculture"],
  landcover: ["land cover"],
  lulc: ["land cover", "land use"],
  "land-use and land-cover change": ["land cover", "land use"],
  "vegetation cover": ["vegetation"],
  remotesensing: ["remote sensing"],
  satellite: ["satellite imagery"],
  imagery: ["satellite imagery"],
  "street level imagery": ["imagery"],
  "perspective images": ["imagery"],
  drone: ["imagery"],
  "landsat 8": ["landsat"],
  "planet fusion": ["planetscope"],
  "rainfall radar": ["precipitation", "radar"],
  imerg: ["precipitation", "imerg"],
  gpm: ["precipitation", "gpm"],
  mrms: ["precipitation", "mrms"],
  tamsat: ["precipitation", "tamsat"],
  forecast: ["forecasting"],
  forecasts: ["forecasting"],
  nwp: ["forecasting", "weather"],
  "reanalysis data": ["reanalysis"],
  "climate reanalysis": ["reanalysis", "climate"],
  era5: ["reanalysis", "climate"],
  "tropical storm": ["weather"],
  temperature: ["weather"],
  dust: ["aerosol"],
  "climate change": ["climate"],
  emissions: ["carbon"],
  "carbon emissions": ["carbon"],
  "net zero": ["carbon"],
  "forest carbon": ["forest", "carbon"],
  cdr: ["carbon dioxide removal"],
  trees: ["forest"],
  deforestation: ["forest"],
  fire: ["wildfire"],
  "live fuel moisture": ["wildfire"],
  "species distribution model": ["biodiversity"],
  beetles: ["biodiversity"],
  ticks: ["biodiversity"],
  fish: ["fishery"],
  fishbase: ["fishery"],
  "southern ocean": ["ocean"],
  aquatics: ["ocean"],
  hydrography: ["hydrology"],
  "national hydrology dataset": ["nhd", "hydrology"],
  nhd: ["nhd", "hydrology"],
  wbd: ["hydrology"],
  "watershed boundaries": ["hydrology"],
  flowlines: ["hydrology"],
  waterways: ["hydrology"],
  water: ["hydrology"],
  "groundwater quality": ["hydrology"],
  dem: ["elevation"],
  topography: ["elevation"],
  "topographic map": ["elevation"],
  contour: ["elevation"],
  "lidar 3dtiles mago": ["lidar"],
  buildings: ["building footprint"],
  building: ["building footprint"],
  overture: ["overture maps"],
  overturemaps: ["overture maps"],
  osm: ["openstreetmap"],
  poi: ["place"],
  pois: ["place"],
  businesses: ["place"],
  roads: ["transportation"],
  "taxi zones": ["transportation"],
  "political boundaries": ["admin", "boundary"],
  admin: ["admin", "boundary"],
  boundaries: ["admin", "boundary"],
  timeseries: ["time series"],
  multitemporal: ["time series"],
  "energy use": ["energy"],
  "energy use by fuel": ["energy"],
  "energy transition": ["energy"],
  "energy production": ["energy"],
  "energy efficiency": ["energy"],
  "energy demand": ["energy"],
  "energy demand by sector": ["energy"],
  electricity: ["energy"],
  "electricity generation": ["energy"],
  coal: ["energy"],
  "oil production": ["energy"],
  "natural gas production": ["natural gas"],
  pv: ["solar"],
  photovoltaic: ["solar"],
  insolation: ["solar"],
  "solar maps": ["solar"],
  "eatch monitoring": ["monitoring"],
  "ground-truth": ["ground truth"],
  groundtruthed: ["ground truth"],
  "ground-truthed": ["ground truth"],
  youthmasppers: ["youthmappers"],
  sixpac: ["sigpac"],

  // Tags are singular: a plural, as typed or as the corpus once spelled it,
  // becomes its singular. Names (overture maps, eurocrops) and words with no
  // singular (time series, natural gas) stay as they are.
  aerosols: ["aerosol"], corridors: ["corridor"], crops: ["crop"],
  embeddings: ["embedding"], exports: ["export"], fisheries: ["fishery"],
  forests: ["forest"], "foundation models": ["foundation model"],
  "building footprints": ["building footprint"], imports: ["import"],
  labels: ["label"], "landscape elements": ["landscape element"],
  observations: ["observation"], places: ["place"],
  "protected areas": ["protected area"], tiles: ["tile"],
  wetlands: ["wetland"],

  // Places below country level, to their country.
  us: ["united states"], usa: ["united states"], nyc: ["united states"],
  california: ["united states"], havasu: ["united states"],
  "south fork eel river": ["united states"],
  uk: ["united kingdom"],
  eu: ["europe"],
  swiss: ["switzerland"],
  czech: ["czechia"],
  ksa: ["saudi arabia"], saudiarabia: ["saudi arabia"], riyadh: ["saudi arabia"],
  karnataka: ["india"], karnatak: ["india"], blore: ["india"], ksrsac: ["india"],
  tottori: ["japan"],
  flanders: ["belgium"],
  andalusia: ["spain"], "andalucía": ["spain"], aragon: ["spain"],
  basque: ["spain"], "balearic islands": ["spain"], "canary islands": ["spain"],
  cantabria: ["spain"], "castile and leon": ["spain"],
  castillalamancha: ["spain"], catalonia: ["spain"], extremadura: ["spain"],
  galicia: ["spain"], madrid: ["spain"], navarra: ["spain"],
  valencia: ["spain"],
  // German state codes used by the fiboa datasets.
  bb: ["germany"], mv: ["germany"], nds: ["germany"], nrw: ["germany"],
  sh: ["germany"], sl: ["germany"], th: ["germany"], hamburg: ["germany"],
  bremen: ["germany"],

  // Several tags typed into one.
  "slovenia fiboa field boundaries krms gerk geoparquet vector pmtiles": ["slovenia", ...FIBOA],
  "netherlands fiboa field boundaries aan geoparquet vector pmtiles": ["netherlands", ...FIBOA],
  "luxembourg fiboa field flik boundaries geoparquet vector pmtiles": ["luxembourg", ...FIBOA],
  "ireland fiboa field boundarie geoparquet vector pmtiles": ["ireland", ...FIBOA],
  "belgium wallonia fiboa field boundaries geoparquet vector pmtiles": ["belgium", ...FIBOA],
  "boundary vector agriculture": ["field", "boundary", "vector", "agriculture"],
  "geozarr": ["zarr"],
};
const LOOKUP = new Map<string, string[]>();
for (const [raw, tags] of Object.entries(ALIASES)) {
  const key = canonTag(raw);
  const value = tags.map(canonTag);
  const earlier = LOOKUP.get(key);
  // Two keys spelled the same once respelled must agree, or one would
  // silently replace the other.
  if (earlier && earlier.join() !== value.join()) {
    throw new Error(`ALIASES spell "${raw}" as "${key}", which another key maps differently`);
  }
  LOOKUP.set(key, value);
}

/** Kept in the corpus however few products carry them. */
const KEEP = new Set([
  /** domain */
  "elevation", "forest", "hydrology",
  /** feature type */
  /** place */
  "africa", "antarctica", "austria", "belgium", "brazil", "cambodia",
  "canada", "croatia", "czechia", "denmark", "estonia", "europe", "finland",
  "france", "germany", "india", "ireland", "japan", "latvia", "luxembourg",
  "netherlands", "new zealand", "portugal", "rwanda", "saudi arabia",
  "slovakia", "slovenia", "spain", "sweden", "switzerland", "tanzania",
  "united kingdom", "united states", "vietnam",
  /** methodology */
  "machine learning",
  /** sensor or platform */
  "goes", "metop",
  /** source or project */
  "copernicus", "epa", "esa", "jpss", "nasa", "nsta", "neon", "usgs",
  /** format */
  "csv", "iceberg", "png",
  /** temporal frequency */
  "time series",
].map(canonTag));

/** The tags of each category. Applying refuses while a corpus tag has none. */
const BY_CATEGORY: Record<TagCategory, string[]> = {
  domain: [
    "agriculture", "climate", "weather", "conservation", "biodiversity",
    "ecology", "wildlife", "forests", "vegetation", "crops", "hydrology",
    "ocean", "fisheries", "marine-debris", "atmosphere", "aerosols",
    "precipitation", "wildfire", "energy", "solar", "natural-gas", "carbon",
    "carbon-dioxide-removal", "cloud", "exports", "imports",
  ],
  "feature-type": [
    "field", "boundaries", "admin", "building-footprints", "places",
    "land-cover", "land-use", "crop-type", "transportation", "wetlands",
    "elevation", "bathymetry", "satellite-imagery", "imagery", "labels",
    "ground-truth", "embeddings",
  ],
  place: [
    "global", "africa", "europe", "antarctica", "austria", "belgium",
    "brazil", "cambodia", "canada", "croatia", "czechia", "denmark",
    "estonia", "finland", "france", "germany", "india", "ireland", "japan",
    "latvia", "luxembourg", "netherlands", "new-zealand", "portugal",
    "rwanda", "saudi-arabia", "slovakia", "slovenia", "spain", "sweden",
    "switzerland", "tanzania", "united-kingdom", "united-states", "vietnam",
  ],
  methodology: [
    "remote-sensing", "machine-learning", "foundation-models", "ai",
    "computer-vision", "segmentation", "image-classification",
    "object-detection", "regression", "flood-detection", "forecasting",
    "reanalysis", "gapfilled", "monitoring", "observations",
  ],
  sensor: [
    "sentinel-1", "sentinel-2", "landsat", "modis", "planetscope", "naip",
    "hls", "sar", "radar", "lidar", "geostationary", "goes", "metop", "gpm",
  ],
  source: [
    "fiboa", "fields-of-the-world", "fieldscapes", "eurocrops", "invekos",
    "sigpac", "overture-maps", "openstreetmap", "youthmappers", "nhd",
    "noaa", "usda", "cer", "neb", "census", "microsoft", "google", "clay",
    "copernicus", "epa", "esa", "jpss", "nasa", "nsta", "neon", "usgs",
    "imerg", "mrms", "tamsat",
  ],
  format: [
    "geoparquet", "parquet", "pmtiles", "zarr", "icechunk", "cog",
    "flatgeobuf", "geopackage", "stac", "h3", "tiles", "duckdb",
    "cloud-native", "vector", "raster", "csv", "iceberg", "png",
  ],
  "temporal-frequency": [
    "hourly", "daily", "weekly", "monthly", "yearly", "time-series",
  ],
};
const CATEGORY: Record<string, TagCategory> = Object.fromEntries(
  Object.entries(BY_CATEGORY).flatMap(([category, tags]) =>
    tags.map((tag) => [tag, category as TagCategory])
  )
);

/** In the corpus before any product carries them, so owners can pick one. */
const SEEDED = ["hourly", "daily", "weekly", "monthly", "yearly"];

/** One raw tag as typed → its canonical tags. */
function clean(raw: string): string[] {
  const parts = raw.includes("#") ? raw.split("#") : [raw];
  return parts.flatMap((part) => {
    const tag = canonTag(part);
    return LOOKUP.get(tag) ?? [tag];
  });
}

/** Canonical tags of one product, deduplicated. */
const cleanAll = (tags: string[]) => [...new Set(tags.flatMap(clean))];

function corpusOf(uses: Map<string, number>): Map<string, number> {
  const kept = [...uses].filter(([tag, n]) => n >= MIN_USES || KEEP.has(tag));
  for (const tag of SEEDED) if (!uses.has(tag)) kept.push([tag, 0]);
  return new Map(kept.sort(([a, x], [b, y]) => y - x || a.localeCompare(b)));
}

const uncategorizedIn = (corpus: Map<string, number>) =>
  [...corpus.keys()].filter((tag) => !CATEGORY[tag]);

function report(uses: Map<string, number>, rawCount: number) {
  const corpus = corpusOf(uses);
  console.log(`${rawCount} raw tags → ${uses.size} cleaned → ${corpus.size} in corpus\n`);
  for (const { id, label } of TAG_CATEGORIES) {
    const tags = [...corpus].filter(([tag]) => CATEGORY[tag] === id);
    console.log(`${label} (${tags.length}): ${tags.map(([t, n]) => `${t} (${n})`).join(", ")}`);
  }
  const uncategorized = uncategorizedIn(corpus);
  if (uncategorized.length) console.log(`\nNo category yet: ${uncategorized.join(", ")}`);
  const dropped = [...uses.keys()].filter((tag) => !corpus.has(tag)).sort();
  console.log(`\nDropped (used once, not in KEEP): ${dropped.join(", ")}`);
  return corpus;
}

async function fromCounts(file: string) {
  // Lines as `sort | uniq -c` prints them. Two raw tags on one product that
  // clean to the same tag count twice here, so counts can run slightly high.
  const uses = new Map<string, number>();
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    const [, n, raw] = line.match(/^\s*(\d+) ?(.*)$/)!;
    for (const tag of new Set(clean(raw))) {
      uses.set(tag, (uses.get(tag) ?? 0) + Number(n));
    }
  }
  const corpus = report(uses, lines.length);
  if (process.env.TABLE) {
    console.log("\nTags that change (unchanged ones are only in the list above):");
    console.log("\n| Count | Before | After | Notes |\n| --: | --- | --- | --- |");
    for (const line of lines) {
      const [, n, raw] = line.match(/^\s*(\d+) ?(.*)$/)!;
      const cleaned = cleanAll([raw]);
      const after = cleaned.filter((tag) => corpus.has(tag));
      const why = note(raw, cleaned, after);
      if (!why) continue; // unchanged; the corpus list above shows it
      const cell = (tags: string[]) => tags.map((t) => `\`${t}\``).join(", ");
      console.log(`| ${n} | ${raw ? `\`${raw}\`` : "(empty)"} | ${cell(after) || "—"} | ${why} |`);
    }
  }
}

/** Why a raw tag became what it did, for the preview table. */
function note(raw: string, cleaned: string[], after: string[]): string {
  const tag = canonTag(raw);
  if (!cleaned.length) return "Dropped: noise";
  if (!after.length) return "Dropped: on one product only";
  if (cleaned.length > 1) return "Split into several tags";
  if (after[0] === tag) return raw === tag ? "" : "Normalized (case, #, spaces)";
  return "Merged";
}

async function fromTable(stage: string) {
  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" })
  );
  const products: { account_id: string; product_id: string; tags: string[] }[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await client.send(
      new ScanCommand({
        TableName: `sc-${stage}-products`,
        ProjectionExpression: "account_id, product_id, #m.tags",
        ExpressionAttributeNames: { "#m": "metadata" },
        ExclusiveStartKey,
      })
    );
    for (const item of page.Items ?? []) {
      const tags = [...(item.metadata?.tags ?? [])];
      if (tags.length) products.push({ ...item, tags } as (typeof products)[0]);
    }
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  // Suggested tags, pending or decided, are an admin's on /admin/tags: products
  // keep the pending and approved ones as they are, and their rows, which
  // carry the review record, are left alone.
  const stored: { tag_id: string; pending?: boolean; outcome?: string }[] = [];
  let tagsKey: Record<string, unknown> | undefined;
  do {
    const page = await client.send(
      new ScanCommand({ TableName: `sc-${stage}-tags`, ExclusiveStartKey: tagsKey })
    );
    stored.push(...((page.Items ?? []) as typeof stored));
    tagsKey = page.LastEvaluatedKey;
  } while (tagsKey);
  const reviewed = new Set(
    stored.filter((t) => t.pending || t.outcome === "approved").map((t) => t.tag_id)
  );

  const uses = new Map<string, number>();
  for (const p of products) {
    const tags = cleanAll(p.tags.filter((t) => !reviewed.has(t)));
    for (const tag of tags) uses.set(tag, (uses.get(tag) ?? 0) + 1);
  }
  const corpus = report(uses, new Set(products.flatMap((p) => p.tags)).size);

  const changes = products
    .map((p) => ({
      ...p,
      next: [
        ...new Set(
          p.tags.flatMap((t) =>
            reviewed.has(t) ? [t] : clean(t).filter((c) => corpus.has(c))
          )
        ),
      ],
    }))
    // Compared as JSON: joined, [""] and [] are the same empty string.
    .filter((p) => JSON.stringify(p.next) !== JSON.stringify(p.tags));
  console.log(`\n${changes.length} of ${products.length} tagged products change:`);
  for (const p of changes) {
    console.log(`  ${p.account_id}/${p.product_id}: ${JSON.stringify(p.tags)} → ${JSON.stringify(p.next)}`);
  }

  // Tags from an earlier import that the corpus no longer has. Products no
  // longer carry them once applied. Suggestions are never among them.
  const stale = stored
    .filter((t) => !t.pending && !t.outcome && !corpus.has(t.tag_id))
    .map((t) => t.tag_id)
    .sort();
  console.log(`\n${stale.length} tags to delete from sc-${stage}-tags: ${stale.join(", ")}`);
  const written = [...corpus.keys()].filter((t) => !reviewed.has(t));

  if (!process.env.APPLY) return console.log("\nPreview only. Set APPLY=1 to write.");
  if (uncategorizedIn(corpus).length) {
    throw new Error("Give every corpus tag a category in BY_CATEGORY before applying");
  }
  for (const p of changes) {
    await client.send(
      new UpdateCommand({
        TableName: `sc-${stage}-products`,
        Key: { account_id: p.account_id, product_id: p.product_id },
        UpdateExpression: "SET #m.tags = :tags",
        ExpressionAttributeNames: { "#m": "metadata" },
        ExpressionAttributeValues: { ":tags": p.next },
      })
    );
  }
  for (const tag_id of written) {
    await client.send(
      new PutCommand({
        TableName: `sc-${stage}-tags`,
        Item: { tag_id, category: CATEGORY[tag_id] },
      })
    );
  }
  for (const tag_id of stale) {
    await client.send(new DeleteCommand({ TableName: `sc-${stage}-tags`, Key: { tag_id } }));
  }
  console.log(
    `\nRewrote ${changes.length} products; wrote ${written.length} tags to sc-${stage}-tags and deleted ${stale.length}`
  );
}

const [arg, file] = process.argv.slice(2);
if (!arg) {
  console.error("Usage: npx tsx scripts/clean-tags.ts <stage> | --counts <file>");
  process.exit(1);
}
(arg === "--counts" ? fromCounts(file) : fromTable(arg)).catch((error) => {
  console.error(error);
  process.exit(1);
});
