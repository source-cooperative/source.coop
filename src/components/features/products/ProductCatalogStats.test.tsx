import { render, screen } from "@testing-library/react";
import { ProductCatalogStats } from "./ProductCatalogStats";

const identity = { account_id: "org", product_id: "data" };

it("renders nothing for missing or absent statistics", () => {
  const { container, rerender } = render(<ProductCatalogStats />);
  expect(container).toBeEmptyDOMElement();
  rerender(<ProductCatalogStats entry={identity} />);
  expect(container).toBeEmptyDOMElement();
});

it("shows size, object count, and the most common extensions", () => {
  render(<ProductCatalogStats entry={{ ...identity, total_bytes: 1024, object_count: 1234, exts: { csv: 1, tif: 900, parquet: 300, json: 33, empty: 0 } }} />);
  expect(screen.getByText("1 KB")).toBeInTheDocument();
  expect(screen.getByText("1,234 objects")).toBeInTheDocument();
  expect(screen.getByText("TIF, PARQUET, JSON +1 more")).toHaveAttribute("title", "TIF, PARQUET, JSON, CSV");
});

it("preserves zero statistics and uses a singular object label", () => {
  const { rerender } = render(<ProductCatalogStats entry={{ ...identity, total_bytes: 0, object_count: 0 }} />);
  expect(screen.getByText("0 B")).toBeInTheDocument();
  expect(screen.getByText("0 objects")).toBeInTheDocument();
  rerender(<ProductCatalogStats entry={{ ...identity, object_count: 1 }} />);
  expect(screen.getByText("1 object")).toBeInTheDocument();
});
