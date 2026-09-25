import { parseState } from "./BreakdownExplorer";
import type { AdminDimension } from "@/lib/clients/analytics";

// The account explorer pins its account via scopeFilters and drops the
// dimension; nothing from the query string may put it back.
const SCOPED: AdminDimension[] = ["product", "country", "client"];

describe("parseState", () => {
  it("ignores filters and group-bys on dimensions the view doesn't offer", () => {
    const state = parseState(
      { account: "other-account", groupBy: "account,country" },
      SCOPED,
    );
    expect(state.filters).toEqual({});
    expect(state.groupBy).toEqual(["country"]);
  });

  it("keeps offered filters and group-bys", () => {
    const state = parseState({ country: " US ", groupBy: "product" }, SCOPED);
    expect(state.filters).toEqual({ country: "US" });
    expect(state.groupBy).toEqual(["product"]);
  });

  it("defaults to grouping by product; an empty param means no grouping", () => {
    expect(parseState({}, SCOPED).groupBy).toEqual(["product"]);
    expect(parseState({ groupBy: "" }, SCOPED).groupBy).toEqual([]);
  });
});
