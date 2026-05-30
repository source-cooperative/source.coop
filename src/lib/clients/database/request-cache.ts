import * as React from "react";

/**
 * Request-scoped memoization for database reads.
 *
 * Next.js automatically de-duplicates `fetch()` calls within a single server
 * render, but the AWS SDK does not use `fetch`, so identical DynamoDB reads
 * issued from a route's `layout`, `page`, and `generateMetadata` all hit the
 * database independently. These helpers collapse those duplicate reads for the
 * lifetime of one server request.
 */

// `React.cache` provides per-request memoization, but it only exists in the RSC
// server build (exposed via the `react-server` export condition). It is absent
// from the client build and from Jest, where we fall back to an identity wrapper
// so reads simply run un-deduplicated — correct, just unoptimized.
type CacheWrapper = <A extends unknown[], R>(
  fn: (...args: A) => R
) => (...args: A) => R;

const reactCache: CacheWrapper =
  (React as { cache?: CacheWrapper }).cache ?? ((fn) => fn);

export interface MemoizedRead {
  <R>(key: string, load: () => Promise<R>): Promise<R>;
}

/**
 * Builds a request-scoped read memoizer.
 *
 * `React.cache` returns the same value for the same arguments within a single
 * server request, then resets. We exploit that by memoizing a mutable "cell"
 * object per cache key, then lazily attaching the in-flight promise to that
 * cell — so sequential and concurrent callers with the same key share one query.
 *
 * `cacheImpl` defaults to `React.cache`; tests inject a fake implementation to
 * exercise de-duplication deterministically (see `request-cache.test.ts`).
 */
export function createMemoizedRead(
  cacheImpl: CacheWrapper = reactCache
): MemoizedRead {
  const cellForKey = cacheImpl(
    (_key: string): { promise?: Promise<unknown> } => ({})
  );

  return function memoizedRead<R>(
    key: string,
    load: () => Promise<R>
  ): Promise<R> {
    const cell = cellForKey(key);
    if (!cell.promise) {
      const promise = load();
      cell.promise = promise;
      // Don't poison the key with a rejected promise: a transient failure (e.g.
      // a DynamoDB throttle) would otherwise be replayed to every later caller
      // in this request. Clear the slot on rejection so the next caller retries.
      // In-flight concurrent callers still share this single attempt.
      promise.catch(() => {
        if (cell.promise === promise) cell.promise = undefined;
      });
    }
    return cell.promise as Promise<R>;
  };
}

export const memoizedRead: MemoizedRead = createMemoizedRead();

/**
 * Deterministic JSON for use as a cache key. Object keys are sorted recursively
 * so structurally-equal command inputs map to the same key regardless of key
 * order; arrays keep their order.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const source = val as Record<string, unknown>;
      return Object.keys(source)
        .sort()
        .reduce<Record<string, unknown>>((sorted, k) => {
          sorted[k] = source[k];
          return sorted;
        }, {});
    }
    return val;
  });
}
