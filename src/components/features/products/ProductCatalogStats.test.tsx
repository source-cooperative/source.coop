import { render, screen } from "@testing-library/react";
import {
  defaultMeasure,
  objectTypeSegments,
  formatShare,
  ProductCatalogStats,
} from "./ProductCatalogStats";

const identity = { account_id: "org", product_id: "data" };

const entry = {
  ...identity,
  total_bytes: 10240,
  object_count: 100,
  exts: { csv: 5, TIF: 50, parquet: 25, json: 10 },
  ext_bytes: { csv: 100, TIF: 4096, parquet: 2048, json: 1024 },
};

describe("objectTypeSegments", () => {
  it("keeps the three largest lowercase extensions and folds the rest into other", () => {
    expect(objectTypeSegments(entry, "bytes")).toEqual([
      { label: "tif", value: 4096, share: 0.4 },
      { label: "parquet", value: 2048, share: 0.2 },
      { label: "json", value: 1024, share: 0.1 },
      // csv plus the 2,972 bytes the breakdown doesn't list
      { label: "other", value: 3072, share: 0.3 },
    ]);
    expect(objectTypeSegments(entry, "objects").map((s) => [s.label, s.value]))
      .toEqual([["tif", 50], ["parquet", 25], ["json", 10], ["other", 15]]);
  });

  it("omits other when the top three account for everything", () => {
    expect(objectTypeSegments({ ...identity, object_count: 3, exts: { tif: 2, "": 1 } }, "objects"))
      .toEqual([
        { label: "tif", value: 2, share: 2 / 3 },
        { label: "no extension", value: 1, share: 1 / 3 },
      ]);
  });

  it("breaks ties alphabetically", () => {
    expect(objectTypeSegments({ ...identity, exts: { tif: 2, json: 2, csv: 2 } }, "objects")
      .map((s) => s.label)).toEqual(["csv", "json", "tif"]);
  });

  it("uses the breakdown's sum when the total is missing or smaller", () => {
    expect(objectTypeSegments({ ...identity, exts: { tif: 3, json: 1 } }, "objects")
      .map((s) => s.share)).toEqual([0.75, 0.25]);
    expect(objectTypeSegments({ ...identity, object_count: 1, exts: { tif: 2 } }, "objects")
      .map((s) => s.share)).toEqual([1]);
  });

  it("returns nothing without a breakdown or with zero totals", () => {
    expect(objectTypeSegments({ ...identity, total_bytes: 0 }, "bytes")).toEqual([]);
    expect(objectTypeSegments({ ...identity, exts: { tif: 0 } }, "objects")).toEqual([]);
    expect(objectTypeSegments({ ...identity, object_count: 5 }, "objects")).toEqual([]);
  });
});

it("measures by bytes only when there is a byte breakdown", () => {
  expect(defaultMeasure(entry)).toBe("bytes");
  expect(defaultMeasure({ ...entry, ext_bytes: undefined })).toBe("objects");
  expect(defaultMeasure({ ...entry, ext_bytes: { tif: 0 } })).toBe("objects");
});

it("rounds shares and marks slivers as under one percent", () => {
  expect(formatShare(0.333)).toBe("33%");
  expect(formatShare(0.004)).toBe("<1%");
  expect(formatShare(0)).toBe("0%");
});

describe("ProductCatalogStats", () => {
  it("renders nothing for missing or unusable statistics", () => {
    const { container, rerender } = render(<ProductCatalogStats />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ProductCatalogStats entry={identity} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ProductCatalogStats entry={{ ...identity, exts: { tif: 0 } }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows totals, a labelled bar and a legend measured by size", () => {
    render(<ProductCatalogStats entry={entry} />);
    expect(screen.getByText("10 KB · 100 objects")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Object types by size: tif 40%, parquet 20%, json 10%, other 30%",
    );
    expect(screen.getByText("tif 40%")).toBeInTheDocument();
    expect(screen.getByText("other 30%")).toBeInTheDocument();
  });

  it("shows totals alone when there is no breakdown", () => {
    const { container } = render(
      <ProductCatalogStats entry={{ ...identity, total_bytes: 0, object_count: 0 }} />,
    );
    expect(screen.getByText("0 B · 0 objects")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });
});
