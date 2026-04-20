import { render, screen, fireEvent } from "@testing-library/react";
import { DropdownSection } from "../DropdownSection";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@radix-ui/themes", () => ({
  DropdownMenu: {
    Item: ({
      children,
      onClick,
      disabled,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => (
      <div
        role="menuitem"
        onClick={disabled ? undefined : onClick}
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
  beforeEach(() => {
    mockPush.mockClear();
  });

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

  it("renders without errors when items have href", () => {
    // This specifically validates that the asChild approach no longer causes
    // "React.Children.only expected to receive a single React element child"
    expect(() => {
      render(
        <DropdownSection
          items={[{ href: "/test", children: "Test Item" }]}
        />
      );
    }).not.toThrow();
  });

  it("navigates via router.push when an href item is clicked", () => {
    render(
      <DropdownSection
        items={[{ href: "/some-path", children: "Navigate Here" }]}
      />
    );
    fireEvent.click(screen.getByText("Navigate Here"));
    expect(mockPush).toHaveBeenCalledWith("/some-path");
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

  it("does not navigate when item is disabled", () => {
    render(
      <DropdownSection
        items={[{ href: "/path", children: "Disabled Item", disabled: true }]}
      />
    );
    fireEvent.click(screen.getByText("Disabled Item"));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
