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

it("shows the local date, with the full time and how long ago as its title", () => {
  const updated = new Date(Date.now() - 3 * 86_400_000);
  catalogHook.mockReturnValue(new Map([["org/data", { ...entry, objects_updated_at: updated.toISOString() }]]));
  renderRow();
  expect(screen.getByText("Objects Updated")).toBeInTheDocument();
  const value = screen.getByTitle(/\(3 days ago\)$/);
  expect(value).toHaveTextContent(updated.toLocaleDateString(undefined, { dateStyle: "medium" }));
  expect(value.title).toContain(updated.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" }));
});

it("renders nothing until the catalog loads, or when it has no date", () => {
  catalogHook.mockReturnValue(undefined);
  const { container, rerender } = renderRow();
  expect(container).not.toHaveTextContent("Objects Updated");
  catalogHook.mockReturnValue(new Map([["org/data", entry]]));
  rerender(<Theme><DataList.Root><ProductObjectsUpdated accountId="org" productId="data" /></DataList.Root></Theme>);
  expect(container).not.toHaveTextContent("Objects Updated");
});
