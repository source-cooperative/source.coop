import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// ponytail: R2 cache only, so unstable_cache TTLs work. revalidatePath/Tag
// don't purge until a tag cache is added: https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
