import { render, screen, fireEvent } from "@testing-library/react";
import { DropdownSection } from "../DropdownSection";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("@radix-ui/themes", () => ({
  DropdownMenu: {
    // href items use `asChild`, so the Item renders its child (the Link) AS the
    // menu item. Non-href items render a clickable row driven by onClick.
    Item: ({
      children,
      onClick,
      onSelect,
      disabled,
      asChild,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      onSelect?: () => void;
      disabled?: boolean;
      asChild?: boolean;
    }) =>
      asChild ? (
        <>{children}</>
      ) : (
        <div
          role="menuitem"
          onClick={
            disabled
              ? undefined
              : () => {
                  onSelect?.();
                  onClick?.();
                }
          }
          aria-disabled={disabled}
        >
          {children}
        </div>
      ),
    Label: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Separator: () => <hr />,
  },
}));

describe("DropdownSection", () => {
  it("renders items", () => {
    render(
      <DropdownSection
        items={[
          { href: "/path1", children: "Item One" },
          { href: "/path2", children: "Item Two" },
        ]}
      />
    );
    expect(screen.getByText("Item One")).toBeInTheDocument();
    expect(screen.getByText("Item Two")).toBeInTheDocument();
  });

  it("renders href items as a real anchor link (Next Link handles navigation)", () => {
    render(
      <DropdownSection items={[{ href: "/test", children: "Test Item" }]} />
    );
    const link = screen.getByText("Test Item").closest("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", "/test");
  });

  it("calls onClick handler for non-href items", () => {
    const handleClick = jest.fn();
    render(
      <DropdownSection
        items={[{ onClick: handleClick, children: "Click Me" }]}
      />
    );
    fireEvent.click(screen.getByText("Click Me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onClick for a disabled non-href item", () => {
    const handleClick = jest.fn();
    render(
      <DropdownSection
        items={[{ onClick: handleClick, children: "Disabled", disabled: true }]}
      />
    );
    fireEvent.click(screen.getByText("Disabled"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders a label when provided", () => {
    render(
      <DropdownSection
        label="My Section"
        items={[{ href: "/path", children: "Item" }]}
      />
    );
    expect(screen.getByText("My Section")).toBeInTheDocument();
  });

  it("renders nothing when condition is false", () => {
    const { container } = render(
      <DropdownSection
        condition={false}
        items={[{ href: "/path", children: "Item" }]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when all items have condition false", () => {
    const { container } = render(
      <DropdownSection
        items={[{ href: "/path", children: "Item", condition: false }]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders only items whose condition is not false (mixed conditions)", () => {
    render(
      <DropdownSection
        items={[
          { href: "/visible", children: "Visible Item", condition: true },
          { href: "/hidden", children: "Hidden Item", condition: false },
        ]}
      />
    );
    expect(screen.getByText("Visible Item")).toBeInTheDocument();
    expect(screen.queryByText("Hidden Item")).not.toBeInTheDocument();
  });
});
