import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { ProductAnalyticsView } from "./ProductAnalyticsView";
import type { UsagePoint } from "@/lib/clients/analytics";

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const days: UsagePoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 5, 7 + i)).toISOString(),
  bytes: i,
  requests: i,
  countries: 1,
}));

it("renders stats, country ranking, and top files", () => {
  render(
    <Theme>
      <ProductAnalyticsView
        accountId="acct"
        productId="prod"
        days={days}
        totals={{ bytes: 2.3 * 1024 ** 3, requests: 12847, countries: 42 }}
        users={{ registered: 0, anonRequests: 0, frequency: [] }}
        breakdowns={{
          countries: [{ code: "US", name: "United States", requests: 3597 }],
          otherCountries: { count: 37, requests: 4231 },
          files: [
            { path: "global-land-cover-2023.tif", requests: 9214, bytes: 2.3 * 1024 ** 3 },
          ],
        }}
      />
    </Theme>,
  );

  expect(screen.getByText("12,847")).toBeInTheDocument();
  // Daily avg = ~round(12847 / 30)
  expect(screen.getByText("~428")).toBeInTheDocument();
  expect(screen.getByText("By country")).toBeInTheDocument();
  expect(screen.getByText("United States")).toBeInTheDocument();
  expect(screen.getByText("37 others")).toBeInTheDocument();
  const fileLink = screen.getByRole("link", {
    name: "global-land-cover-2023.tif",
  });
  expect(fileLink).toHaveAttribute(
    "href",
    "/acct/prod/global-land-cover-2023.tif",
  );
  expect(screen.getByText("9,214")).toBeInTheDocument();
});
