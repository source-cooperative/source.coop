/**
 * Test doubles for the request-cache's `React.cache` wrapper.
 *
 * Lives outside any `*.test.ts` file so Jest's `testMatch` does not try to run
 * it as a suite; it is imported by the database cache tests.
 */

/**
 * Mimics `React.cache`: memoizes the wrapped function's result by its first
 * argument for the lifetime of the wrapper (i.e. one simulated "request").
 */
export function fakeReactCache<A extends unknown[], R>(
  fn: (...args: A) => R
): (...args: A) => R {
  const store = new Map<unknown, R>();
  return (...args: A): R => {
    const k = args[0];
    if (!store.has(k)) store.set(k, fn(...args));
    return store.get(k) as R;
  };
}

/**
 * Mimics the no-op fallback used outside an RSC render, where `React.cache` is
 * absent: returns the function unwrapped, so nothing is memoized.
 */
export const identity = <A extends unknown[], R>(fn: (...args: A) => R) => fn;
