import { render, screen } from "@testing-library/react";
import {
  catalogObjectsPhrase,
  defaultMeasure,
  objectTypeSegments,
  formatShare,
  ProductCatalogStats,
  StoreFormatPill,
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
  expect(formatShare(0.996)).toBe(">99%");
  expect(formatShare(1)).toBe("100%");
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

  it("leads the bar with the total bytesize, with the legend beneath", () => {
    const { container } = render(<ProductCatalogStats entry={entry} />);
    expect(screen.getByText("10 KB")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Object types by bytesize: tif 40%, parquet 20%, json 10%, other 30%",
    );
    expect(screen.getByText("tif 40%")).toBeInTheDocument();
    expect(screen.getByText("other 30%")).toBeInTheDocument();
    // The object count belongs to the card's metadata row, not the footer.
    expect(container).not.toHaveTextContent("objects");
  });

  it("leads with the object count when there is no byte breakdown", () => {
    render(<ProductCatalogStats entry={{ ...entry, ext_bytes: undefined }} />);
    expect(screen.getByText("100 objects")).toBeInTheDocument();
    expect(screen.getByText("tif 50%")).toBeInTheDocument();
  });

  it("shows the total alone when there is no breakdown", () => {
    const { container } = render(
      <ProductCatalogStats entry={{ ...identity, total_bytes: 0, object_count: 1 }} />,
    );
    expect(screen.getByText("1 object")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });
});

describe("catalogObjectsPhrase", () => {
  const now = Date.now();
  const daysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString();

  it("pairs the object count with when the objects last changed", () => {
    expect(catalogObjectsPhrase({ ...entry, objects_updated_at: daysAgo(3) }))
      .toMatch(/^100 objects, updated 3 days ago$/);
  });

  it("says as much as the catalog knows", () => {
    expect(catalogObjectsPhrase(entry)).toBe("100 objects");
    expect(catalogObjectsPhrase({ ...identity, objects_updated_at: daysAgo(3) }))
      .toMatch(/^Objects updated 3 days ago$/);
    expect(catalogObjectsPhrase(identity)).toBeUndefined();
    expect(catalogObjectsPhrase(undefined)).toBeUndefined();
  });
});

it("shows the store format as a pill only when there is one", () => {
  const { container, rerender } = render(<StoreFormatPill entry={entry} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<StoreFormatPill entry={{ ...entry, store_format: "zarr" }} />);
  expect(screen.getByText("zarr")).toBeInTheDocument();
});
