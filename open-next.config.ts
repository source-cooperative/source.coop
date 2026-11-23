import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";

// R2 lives in one region, so the Cache API sits in front of it. No tag cache or
// queue yet, so revalidatePath/Tag don't purge and time-based revalidation is
// unsynced: https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
});
