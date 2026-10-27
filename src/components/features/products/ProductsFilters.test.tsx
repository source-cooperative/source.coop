import { render, screen, act, fireEvent } from "@testing-library/react";
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

const tagOptions = ["climate", "hls", "landsat"];

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

    renderWithTheme(<ProductsFilters tagOptions={tagOptions} />);

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

    renderWithTheme(<ProductsFilters tagOptions={tagOptions} />);

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

    renderWithTheme(<ProductsFilters tagOptions={tagOptions} />);

    act(() => {
      jest.advanceTimersByTime(600);
    });

    const strippingCalls = mockPush.mock.calls.filter(
      ([url]: [string]) =>
        !url.includes("tags=") || !url.includes("search=")
    );
    expect(strippingCalls).toHaveLength(0);
  });

  it("should render search and chosen tags from URL params", () => {
    mockSearchParams.set("tags", "hls,climate");
    mockSearchParams.set("search", "satellite");

    renderWithTheme(<ProductsFilters tagOptions={tagOptions} />);

    expect(screen.getByPlaceholderText("Search products...")).toHaveValue(
      "satellite"
    );
    expect(screen.getByLabelText("Remove hls")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove climate")).toBeInTheDocument();
  });

  it("should filter by the remaining tags when one is removed", () => {
    mockSearchParams.set("tags", "hls,climate");

    renderWithTheme(<ProductsFilters tagOptions={tagOptions} />);
    mockPush.mockClear();
    fireEvent.click(screen.getByLabelText("Remove hls"));

    expect(mockPush).toHaveBeenCalledWith("/products?tags=climate");
  });
});
