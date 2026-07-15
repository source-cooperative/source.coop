import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
        users={{
          uniqueIps: 0,
          registered: 0,
          anonRequests: 0,
          distribution: [],
        }}
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

it("renders the Pareto chart on the Users tab", async () => {
  render(
    <Theme>
      <ProductAnalyticsView
        accountId="acct"
        productId="prod"
        days={days}
        totals={{ bytes: 1024, requests: 10, countries: 1 }}
        users={{
          uniqueIps: 555,
          registered: 5,
          anonRequests: 10,
          distribution: [
            { label: "1", ips: 520 },
            { label: "2", ips: 0 },
            { label: "3–5", ips: 35 },
          ],
        }}
        breakdowns={null}
      />
    </Theme>,
  );
  await userEvent.click(screen.getByRole("tab", { name: /users/i }));
  expect(
    screen.getByRole("img", { name: /pareto chart of unique ips/i }),
  ).toBeInTheDocument();
  expect(screen.getByText("cumulative")).toBeInTheDocument();
});
