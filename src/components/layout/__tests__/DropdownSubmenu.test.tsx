import { render, screen } from "@testing-library/react";
import { DropdownSubmenu } from "../DropdownSection";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mirror DropdownSection.test.tsx: mock the Radix primitives down to plain DOM
// so we assert structure (which items/actions render, and the separator
// between them) without the real popper/Slot machinery.
jest.mock("@radix-ui/themes", () => ({
  DropdownMenu: {
    Sub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SubTrigger: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SubContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Item: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
      asChild ? <>{children}</> : <div role="menuitem">{children}</div>,
    Separator: () => <hr data-testid="separator" />,
  },
}));

describe("DropdownSubmenu", () => {
  it("renders the label, items, then actions", () => {
    render(
      <DropdownSubmenu
        label="Organizations"
        items={[{ href: "/acme", children: "Acme" }]}
        actions={[{ href: "/new", children: "Add Organization" }]}
      />
    );
    expect(screen.getByText("Organizations")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Add Organization")).toBeInTheDocument();
    // separator only when there are BOTH items and actions
    expect(screen.getByTestId("separator")).toBeInTheDocument();
  });

  it("omits the separator when there are no items (actions only)", () => {
    render(
      <DropdownSubmenu
        label="Products"
        items={[]}
        actions={[{ href: "/products", children: "All Products" }]}
      />
    );
    expect(screen.getByText("All Products")).toBeInTheDocument();
    expect(screen.queryByTestId("separator")).not.toBeInTheDocument();
  });

  it("renders nothing when condition is false", () => {
    const { container } = render(
      <DropdownSubmenu
        condition={false}
        label="Admin"
        items={[{ href: "/admin", children: "Tool" }]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when no items or actions are visible", () => {
    const { container } = render(
      <DropdownSubmenu
        label="Organizations"
        items={[{ href: "/x", children: "Hidden", condition: false }]}
        actions={[{ href: "/new", children: "Add", condition: false }]}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
