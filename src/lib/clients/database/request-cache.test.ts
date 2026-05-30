import { createMemoizedRead, stableStringify } from "./request-cache";

// Mimics React.cache for tests: memoizes the wrapped function's result by its
// first argument for the lifetime of the wrapper (i.e. one "request").
function fakeReactCache<A extends unknown[], R>(
  fn: (...args: A) => R
): (...args: A) => R {
  const store = new Map<unknown, R>();
  return (...args: A): R => {
    const k = args[0];
    if (!store.has(k)) store.set(k, fn(...args));
    return store.get(k) as R;
  };
}

const identity = <A extends unknown[], R>(fn: (...args: A) => R) => fn;

describe("createMemoizedRead", () => {
  it("runs the loader once for repeated calls with the same key", async () => {
    const memoizedRead = createMemoizedRead(fakeReactCache);
    const loader = jest.fn().mockResolvedValue("value");

    const a = await memoizedRead("k", loader);
    const b = await memoizedRead("k", loader);

    expect(a).toBe("value");
    expect(b).toBe("value");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("runs the loader once per distinct key", async () => {
    const memoizedRead = createMemoizedRead(fakeReactCache);
    const loader = jest.fn((k: string) => Promise.resolve(k));

    await memoizedRead("a", () => loader("a"));
    await memoizedRead("b", () => loader("b"));
    await memoizedRead("a", () => loader("a"));

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does not dedupe when the cache implementation is a no-op (outside an RSC render)", async () => {
    const memoizedRead = createMemoizedRead(identity);
    const loader = jest.fn().mockResolvedValue("value");

    await memoizedRead("k", loader);
    await memoizedRead("k", loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("shares a single in-flight promise for concurrent callers with the same key", async () => {
    const memoizedRead = createMemoizedRead(fakeReactCache);
    const loader = jest.fn(() => Promise.resolve("v"));

    const [a, b] = await Promise.all([
      memoizedRead("k", loader),
      memoizedRead("k", loader),
    ]);

    expect(a).toBe("v");
    expect(b).toBe("v");
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

describe("stableStringify", () => {
  it("produces the same string regardless of top-level key order", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(
      stableStringify({ b: 2, a: 1 })
    );
  });

  it("sorts keys in nested objects", () => {
    expect(stableStringify({ x: { a: 1, b: 2 } })).toBe(
      stableStringify({ x: { b: 2, a: 1 } })
    );
  });

  it("preserves array order", () => {
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]));
  });
});
