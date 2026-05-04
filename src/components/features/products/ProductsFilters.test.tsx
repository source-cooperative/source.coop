import { render, screen, act } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";

const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/products",
  useSearchParams: () => mockSearchParams,
}));

import { ProductsFilters } from "./ProductsFilters";

const renderWithTheme = (component: React.ReactElement) => {
  return render(<Theme>{component}</Theme>);
};

describe("ProductsFilters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSearchParams.delete("tags");
    mockSearchParams.delete("search");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should preserve tags query param from URL on mount", () => {
    mockSearchParams.set("tags", "hls");

    renderWithTheme(<ProductsFilters />);

    // Advance past the debounce delay
    act(() => {
      jest.advanceTimersByTime(600);
    });

    // router.push should not be called to strip the tags param
    const strippingCalls = mockPush.mock.calls.filter(
      ([url]: [string]) => !url.includes("tags=")
    );
    expect(strippingCalls).toHaveLength(0);
  });

  it("should preserve search query param from URL on mount", () => {
    mockSearchParams.set("search", "climate");

    renderWithTheme(<ProductsFilters />);

    act(() => {
      jest.advanceTimersByTime(600);
    });

    const strippingCalls = mockPush.mock.calls.filter(
      ([url]: [string]) => !url.includes("search=")
    );
    expect(strippingCalls).toHaveLength(0);
  });

  it("should preserve both tags and search params from URL on mount", () => {
    mockSearchParams.set("tags", "hls");
    mockSearchParams.set("search", "satellite");

    renderWithTheme(<ProductsFilters />);

    act(() => {
      jest.advanceTimersByTime(600);
    });

    const strippingCalls = mockPush.mock.calls.filter(
      ([url]: [string]) =>
        !url.includes("tags=") || !url.includes("search=")
    );
    expect(strippingCalls).toHaveLength(0);
  });

  it("should render input fields with values from URL params", () => {
    mockSearchParams.set("tags", "hls");
    mockSearchParams.set("search", "satellite");

    renderWithTheme(<ProductsFilters />);

    const searchInput = screen.getByPlaceholderText("Search products...");
    const tagsInput = screen.getByPlaceholderText(
      "Filter by tags (comma-separated)"
    );

    expect(searchInput).toHaveValue("satellite");
    expect(tagsInput).toHaveValue("hls");
  });
});
