import { render, screen } from "@testing-library/react";
import { Theme, DropdownMenu } from "@radix-ui/themes";
import { DropdownSection } from "../DropdownSection";

// Unlike DropdownSection.test.tsx (which mocks DropdownMenu to assert prop
// wiring), this suite renders the REAL Radix Themes DropdownMenu in an open
// state. It guards against the `React.Children.only` crash that fires when the
// menu opens if `@radix-ui/react-slot` is duplicated across versions: themes
// builds the `Slottable` wrapper inside an `asChild` DropdownMenu.Item from one
// react-slot copy while the item's underlying primitive resolves another, so
// the Slottable goes unrecognized and the Slot throws. A mocked DropdownMenu
// cannot catch this — it must be the real component, opened.

beforeAll(() => {
  // jsdom lacks ResizeObserver, which Radix's popper positioning uses.
  (global as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function renderOpenMenu(ui: React.ReactNode) {
  return render(
    <Theme>
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>
          <button>open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>{ui}</DropdownMenu.Content>
      </DropdownMenu.Root>
    </Theme>
  );
}

describe("DropdownSection in a real open DropdownMenu", () => {
  it("renders asChild link items without throwing React.Children.only", () => {
    renderOpenMenu(
      <>
        <DropdownSection
          label="Account"
          items={[
            { href: "/a", children: "View Profile" },
            { href: "/b", children: "Edit Profile" },
          ]}
        />
        <DropdownSection
          items={[{ onClick: () => {}, children: "Logout", color: "red" }]}
          showSeparator={false}
        />
      </>
    );

    expect(screen.getByText("View Profile").closest("a")).toHaveAttribute(
      "href",
      "/a"
    );
    expect(screen.getByText("Edit Profile").closest("a")).toHaveAttribute(
      "href",
      "/b"
    );
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });
});
