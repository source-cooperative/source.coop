import { render, screen } from "@testing-library/react";
import { useCatalog } from "@/hooks/useCatalog";
import { ProductCatalogSummary } from "./ProductCatalogSummary";

jest.mock("@/hooks/useCatalog", () => ({ useCatalog: jest.fn() }));
const catalogHook = jest.mocked(useCatalog);

beforeEach(() => catalogHook.mockReset());

it("renders the current product's statistics without including other products", () => {
  catalogHook.mockReturnValue(new Map([
    ["org/data", { account_id: "org", product_id: "data", total_bytes: 1024, object_count: 2, exts: { tif: 2 } }],
    ["other/data", { account_id: "other", product_id: "data", object_count: 99 }],
  ]));
  render(<ProductCatalogSummary accountId="org" productId="data" />);
  expect(catalogHook).toHaveBeenCalledWith(true);
  expect(screen.getByText("1 KB")).toBeInTheDocument();
  expect(screen.getAllByText("2")).toHaveLength(2);
  expect(screen.getByRole("rowheader", { name: "tif" })).toBeInTheDocument();
  expect(screen.queryByText("99")).not.toBeInTheDocument();
});

it("renders nothing while loading, on failure, or without a matching entry", () => {
  const { container, rerender } = render(<ProductCatalogSummary accountId="org" productId="data" />);
  expect(container).toBeEmptyDOMElement();
  catalogHook.mockReturnValue(new Map());
  rerender(<ProductCatalogSummary accountId="org" productId="data" />);
  expect(container).toBeEmptyDOMElement();
});

it.each([
  {},
  { exts: {} },
  { exts: { "": 0, tif: 0 } },
])("leaves no wrapper for a matched entry with no displayable statistics: %j", (statistics) => {
  catalogHook.mockReturnValue(new Map([
    ["org/data", { account_id: "org", product_id: "data", ...statistics }],
  ]));
  const { container } = render(<ProductCatalogSummary accountId="org" productId="data" />);
  expect(container).toBeEmptyDOMElement();
});

it("updates the lookup when navigating between products", () => {
  catalogHook.mockReturnValue(new Map([
    ["org/data", { account_id: "org", product_id: "data", object_count: 2 }],
    ["org/next", { account_id: "org", product_id: "next", object_count: 3 }],
  ]));
  const { rerender } = render(<ProductCatalogSummary accountId="org" productId="data" />);
  expect(screen.getByText("2")).toBeInTheDocument();
  rerender(<ProductCatalogSummary accountId="org" productId="next" />);
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.queryByText("2")).not.toBeInTheDocument();
});
