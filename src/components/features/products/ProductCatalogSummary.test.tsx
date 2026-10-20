import { fireEvent, render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { useCatalog } from "@/hooks/useCatalog";
import { ProductCatalogSummary } from "./ProductCatalogSummary";

jest.mock("@/hooks/useCatalog", () => ({ useCatalog: jest.fn() }));
const catalogHook = jest.mocked(useCatalog);

const renderSummary = (productId = "data") =>
  render(<ProductCatalogSummary accountId="org" productId={productId} />, { wrapper: Theme });

beforeEach(() => catalogHook.mockReset());

it("renders the current product's statistics without including other products", () => {
  catalogHook.mockReturnValue(new Map([
    ["org/data", {
      account_id: "org", product_id: "data", total_bytes: 2048, object_count: 4,
      exts: { tif: 1, json: 3 }, ext_bytes: { tif: 1536, json: 512 },
    }],
    ["other/data", { account_id: "other", product_id: "data", object_count: 99 }],
  ]));
  renderSummary();
  expect(catalogHook).toHaveBeenCalledWith(true);
  expect(screen.getByText("2 KB")).toBeInTheDocument();
  expect(screen.getByText("4")).toBeInTheDocument();
  expect(screen.queryByText("99")).not.toBeInTheDocument();
  expect(screen.getByRole("img")).toHaveAccessibleName("File types by size: tif 75%, json 25%");
});

it("switches the breakdown to file counts", () => {
  catalogHook.mockReturnValue(new Map([
    ["org/data", {
      account_id: "org", product_id: "data", total_bytes: 2048, object_count: 4,
      exts: { tif: 1, json: 3 }, ext_bytes: { tif: 1536, json: 512 },
    }],
  ]));
  renderSummary();
  fireEvent.click(screen.getByRole("radio", { name: "Count" }));
  expect(screen.getByText("By file count")).toBeInTheDocument();
  expect(screen.getByRole("img")).toHaveAccessibleName("File types by file count: json 75%, tif 25%");
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
])("renders nothing for a matched entry with no displayable statistics: %j", (statistics) => {
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
  const { rerender } = renderSummary();
  expect(screen.getByText("2")).toBeInTheDocument();
  rerender(<ProductCatalogSummary accountId="org" productId="next" />);
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.queryByText("2")).not.toBeInTheDocument();
});
