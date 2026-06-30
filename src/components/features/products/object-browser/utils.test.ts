import { retainPresent } from "./utils";

describe("retainPresent", () => {
  it("keeps a deleted path while the (stale) listing still lists it", () => {
    // Listing hasn't caught up to the delete yet → keep hiding it.
    const next = retainPresent(new Set(["dir/"]), ["dir/", "other.txt"]);
    expect([...next]).toEqual(["dir/"]);
  });

  it("drops a deleted path once the listing no longer lists it", () => {
    // Server agrees it's gone → stop tracking it (cleanup, no resurrection).
    const next = retainPresent(new Set(["dir/"]), ["other.txt"]);
    expect(next.size).toBe(0);
  });

  it("never resurrects: a path absent from the listing is not retained", () => {
    const next = retainPresent(new Set(["a.txt", "b.txt"]), ["b.txt"]);
    expect([...next]).toEqual(["b.txt"]);
  });
});
