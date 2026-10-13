#!/usr/bin/env tsx
/**
 * Clean the free-text tags products carry and build the tag corpus from them.
 *
 * Each tag is lowercased, stripped of `#`, split if it holds several tags, and
 * mapped through ALIASES to its canonical form (or dropped). A canonical tag
 * joins the corpus when at least MIN_USES products carry it, or when it is in
 * KEEP. Each product then keeps only its cleaned tags that made the corpus.
 *
 * Usage:
 *   npx tsx scripts/clean-tags.ts <stage>               # preview from DynamoDB
 *   APPLY=1 npx tsx scripts/clean-tags.ts <stage>       # rewrite products, write corpus
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
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const MIN_USES = 2;

const FIBOA = ["fiboa", "field boundaries", "geoparquet", "vector", "pmtiles"];

/** Normalized tag → canonical tags. An empty list drops the tag. */
const ALIASES: Record<string, string[]> = {
  // Noise: true of every product on Source, placeholders, or tests.
  "": [], "--": [], geospatial: [], "geo spatial": [], dataset: [], data: [],
  misc: [], test: [], foo: [], testrepo12: [], "test unidata netcdf": [],
  static: [], years: [], source: [], opendata: [], "open data": [],
  public: [], "public-data": [], aws: [], "2024": [], rgb: [], aois: [],
  tabaqat: [], cbam: [], euhvd: [], analysis: [], metadata: [], land: [],
  earth: [], field: [], polygon: [], image: [], state: [], county: [],
  countries: [], arc: [], amx: [], sfer: [], sax: [], hcat: [], ome: [],
  lowcoder: [], lacuna: [], wadhwaniai: [], pacificspatial: [],

  // Spelling, plurals and synonyms.
  "field boundary": ["field boundaries"],
  fieldboundaries: ["field boundaries"],
  "field boundarie": ["field boundaries"],
  boundary: ["field boundaries"],
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
  "foundational model": ["foundation models"],
  embedding: ["embeddings"],
  crop: ["crops"],
  croptype: ["crop type"],
  cdl: ["crop type", "united states"],
  maize: ["crops"],
  wheat: ["crops"],
  cotton: ["crops"],
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
  imerg: ["precipitation"],
  gpm: ["precipitation"],
  mrms: ["precipitation"],
  tamsat: ["precipitation"],
  forecast: ["forecasting"],
  forecasts: ["forecasting"],
  nwp: ["forecasting", "weather"],
  "reanalysis data": ["reanalysis"],
  "climate reanalysis": ["reanalysis", "climate"],
  era5: ["reanalysis", "climate"],
  "tropical storm": ["weather"],
  temperature: ["weather"],
  aerosol: ["aerosols"],
  dust: ["aerosols"],
  "climate change": ["climate"],
  emissions: ["carbon"],
  "carbon emissions": ["carbon"],
  "net zero": ["carbon"],
  "forest carbon": ["forests", "carbon"],
  cdr: ["carbon dioxide removal"],
  forest: ["forests"],
  trees: ["forests"],
  deforestation: ["forests"],
  biomass: ["forests"],
  fire: ["wildfire"],
  "live fuel moisture": ["wildfire"],
  "species distribution model": ["biodiversity"],
  beetles: ["biodiversity"],
  ticks: ["biodiversity"],
  fish: ["fisheries"],
  fishbase: ["fisheries"],
  "southern ocean": ["ocean"],
  sst: ["ocean"],
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
  height: ["elevation"],
  "3d tiles": ["lidar"],
  "lidar 3dtiles mago": ["lidar"],
  "building footprint": ["building footprints"],
  buildings: ["building footprints"],
  building: ["building footprints"],
  overture: ["overture maps"],
  overturemaps: ["overture maps"],
  osm: ["openstreetmap"],
  poi: ["places"],
  pois: ["places"],
  businesses: ["places"],
  roads: ["transportation"],
  "taxi zones": ["transportation"],
  "political boundaries": ["admin boundaries"],
  admin: ["admin boundaries"],
  boundaries: ["admin boundaries"],
  timeseries: ["time series"],
  multitemporal: ["time series"],
  observation: ["observations"],
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
  "ground-truth": ["labels"],
  groundtruthed: ["labels"],
  "ground-truthed": ["labels"],
  youthmasppers: ["youthmappers"],
  sixpac: ["sigpac"],

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
  "boundary vector agriculture": ["field boundaries", "vector", "agriculture"],
};

/** Kept in the corpus however few products carry them. */
const KEEP = new Set([
  "africa", "antarctica", "austria", "belgium", "brazil", "cambodia",
  "canada", "croatia", "czechia", "denmark", "estonia", "europe", "finland",
  "france", "germany", "india", "ireland", "japan", "latvia", "luxembourg",
  "netherlands", "new zealand", "portugal", "rwanda", "saudi arabia",
  "slovakia", "slovenia", "spain", "sweden", "switzerland", "tanzania",
  "united kingdom", "united states", "vietnam",
  "elevation", "machine learning", "time series", "forests", "hydrology",
]);

/** One raw tag as typed → its canonical tags. */
function clean(raw: string): string[] {
  const parts = raw.includes("#") ? raw.split("#") : [raw];
  return parts.flatMap((part) => {
    const tag = part.trim().toLowerCase();
    return ALIASES[tag] ?? [tag];
  });
}

/** Canonical tags of one product, deduplicated. */
const cleanAll = (tags: string[]) => [...new Set(tags.flatMap(clean))];

function corpusOf(uses: Map<string, number>): Map<string, number> {
  return new Map(
    [...uses]
      .filter(([tag, n]) => n >= MIN_USES || KEEP.has(tag))
      .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
  );
}

function report(uses: Map<string, number>, rawCount: number) {
  const corpus = corpusOf(uses);
  console.log(`${rawCount} raw tags → ${uses.size} cleaned → ${corpus.size} in corpus\n`);
  for (const [tag, n] of corpus) console.log(`${String(n).padStart(4)} ${tag}`);
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
  const tag = raw.replace(/#/g, "").trim().toLowerCase();
  if (!cleaned.length) return "Dropped: noise";
  if (!after.length) return "Dropped: on one product only";
  if (cleaned.length > 1) return "Split into several tags";
  if (after[0] === tag) return raw === tag ? "" : "Normalized (case, #)";
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

  const uses = new Map<string, number>();
  for (const p of products) {
    for (const tag of cleanAll(p.tags)) uses.set(tag, (uses.get(tag) ?? 0) + 1);
  }
  const corpus = report(uses, new Set(products.flatMap((p) => p.tags)).size);

  const changes = products
    .map((p) => ({ ...p, next: cleanAll(p.tags).filter((t) => corpus.has(t)) }))
    .filter((p) => p.next.join("\0") !== p.tags.join("\0"));
  console.log(`\n${changes.length} of ${products.length} tagged products change:`);
  for (const p of changes) {
    console.log(`  ${p.account_id}/${p.product_id}: [${p.tags.join(", ")}] → [${p.next.join(", ")}]`);
  }

  if (!process.env.APPLY) return console.log("\nPreview only. Set APPLY=1 to write.");
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
  for (const tag_id of corpus.keys()) {
    await client.send(new PutCommand({ TableName: `sc-${stage}-tags`, Item: { tag_id } }));
  }
  console.log(`\nRewrote ${changes.length} products; wrote ${corpus.size} tags to sc-${stage}-tags`);
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
