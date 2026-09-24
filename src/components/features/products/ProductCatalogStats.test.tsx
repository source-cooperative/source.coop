import { render, screen, within } from "@testing-library/react";
import { ProductCatalogStats } from "./ProductCatalogStats";

const identity = { account_id: "org", product_id: "data" };

it("renders no card for missing or unusable statistics", () => {
  const { container, rerender } = render(<ProductCatalogStats />);
  expect(container).toBeEmptyDOMElement();
  rerender(<ProductCatalogStats entry={identity} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<ProductCatalogStats entry={{ ...identity, exts: { tif: 0 } }} />);
  expect(container).toBeEmptyDOMElement();
});

it("shows the top three lowercase extensions with whole-product totals and percentages", () => {
  render(<ProductCatalogStats entry={{
    ...identity,
    total_bytes: 10240,
    object_count: 100,
    exts: { csv: 5, TIF: 50, parquet: 25, json: 10 },
    ext_bytes: { csv: 100, TIF: 4096, parquet: 2048, json: 1024 },
  }} />);
  const rows = screen.getAllByRole("row");
  expect(rows).toHaveLength(5);
  expect(rows.slice(1).map((row) => within(row).getByRole("rowheader").textContent))
    .toEqual(["tif", "parquet", "json", "Total (all files)"]);
  expect(within(rows[1]).getAllByRole("cell").map((cell) => cell.textContent))
    .toEqual(["5050%", "4 KB40%"]);
  expect(within(rows[4]).getAllByRole("cell").map((cell) => cell.textContent))
    .toEqual(["100100%", "10 KB100%"]);
  expect(screen.getByText("4 KB").closest("td")).toHaveAttribute("title", "4,096 bytes");
  expect(screen.queryByText("csv")).not.toBeInTheDocument();
});

it("uses an alphabetical tie-break for equal file counts", () => {
  render(<ProductCatalogStats entry={{ ...identity, exts: { tif: 2, json: 2, csv: 2, parquet: 2 } }} />);
  expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent))
    .toEqual(["csv", "json", "parquet", "Total (all files)"]);
});

it("shows missing values as unknown without deriving totals from partial extension maps", () => {
  render(<ProductCatalogStats entry={{ ...identity, exts: { tif: 2 }, ext_bytes: { csv: 1024 } }} />);
  const tif = screen.getByRole("rowheader", { name: "tif" }).closest("tr")!;
  const csv = screen.getByRole("rowheader", { name: "csv" }).closest("tr")!;
  const total = screen.getByRole("rowheader", { name: "Total (all files)" }).closest("tr")!;
  expect(within(tif).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["2", "—"]);
  expect(within(csv).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["—", "1 KB"]);
  expect(within(total).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["—", "—"]);
});

it("includes extensionless files", () => {
  render(<ProductCatalogStats entry={{ ...identity, object_count: 4, total_bytes: 1024, exts: { "": 2 }, ext_bytes: { "": 512 } }} />);
  expect(screen.getByRole("rowheader", { name: "No extension" })).toBeInTheDocument();
  expect(screen.getAllByText("50%")).toHaveLength(2);
});

it("preserves zero totals without dividing by zero", () => {
  const { container } = render(<ProductCatalogStats entry={{ ...identity, total_bytes: 0, object_count: 0 }} />);
  expect(screen.getByText("0 B")).toBeInTheDocument();
  expect(screen.getByText("0")).toBeInTheDocument();
  expect(container).not.toHaveTextContent(/NaN|Infinity|100%/);
});

it("rounds percentage shares to one decimal place", () => {
  render(<ProductCatalogStats entry={{ ...identity, object_count: 3, exts: { tif: 1 } }} />);
  expect(screen.getByText("33.3%")).toBeInTheDocument();
});
