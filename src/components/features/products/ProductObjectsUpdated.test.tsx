import { render, screen } from "@testing-library/react";
import { DataList, Theme } from "@radix-ui/themes";
import { useCatalog } from "@/hooks/useCatalog";
import { ProductObjectsUpdated } from "./ProductObjectsUpdated";

jest.mock("@/hooks/useCatalog", () => ({ useCatalog: jest.fn() }));
const catalogHook = jest.mocked(useCatalog);

const renderRow = () =>
  render(
    <Theme>
      <DataList.Root>
        <ProductObjectsUpdated accountId="org" productId="data" />
      </DataList.Root>
    </Theme>,
  );

const entry = { account_id: "org", product_id: "data" };

it("shows when the product's objects last changed, with the UTC time as its title", () => {
  const objects_updated_at = new Date(Date.now() - 3 * 86_400_000).toISOString();
  catalogHook.mockReturnValue(new Map([["org/data", { ...entry, objects_updated_at }]]));
  renderRow();
  expect(screen.getByText("Objects Updated")).toBeInTheDocument();
  expect(screen.getByText("3 days ago")).toHaveAttribute("title", expect.stringContaining("UTC"));
});

it("renders nothing until the catalog loads, or when it has no date", () => {
  catalogHook.mockReturnValue(undefined);
  const { container, rerender } = renderRow();
  expect(container).not.toHaveTextContent("Objects Updated");
  catalogHook.mockReturnValue(new Map([["org/data", entry]]));
  rerender(<Theme><DataList.Root><ProductObjectsUpdated accountId="org" productId="data" /></DataList.Root></Theme>);
  expect(container).not.toHaveTextContent("Objects Updated");
});
