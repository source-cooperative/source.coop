import { render, screen, fireEvent } from "@testing-library/react";
import { DropdownSection } from "../DropdownSection";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

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
    Item: ({
      children,
      onClick,
      onSelect,
      disabled,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      onSelect?: () => void;
      disabled?: boolean;
    }) => (
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

  it("renders href items as real anchor links for right-click / new-tab support", () => {
    render(
      <DropdownSection items={[{ href: "/test", children: "Test Item" }]} />
    );
    const link = screen.getByText("Test Item").closest("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", "/test");
  });

  it("navigates via router.push when an href item is activated via keyboard", () => {
    render(
      <DropdownSection
        items={[{ href: "/some-path", children: "Navigate Here" }]}
      />
    );
    // Activating the menu item (e.g. via keyboard Enter) fires onSelect
    fireEvent.click(screen.getByRole("menuitem"));
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
    fireEvent.click(screen.getByRole("menuitem"));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
