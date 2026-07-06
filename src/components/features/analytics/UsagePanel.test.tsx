import { render, screen } from "@testing-library/react";
import { UsagePanel, parseActiveIndex } from "./UsagePanel";
import type { UsagePoint } from "@/lib/clients/analytics";

// recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const days: UsagePoint[] = Array.from({ length: 28 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 5, 9 + i)).toISOString(),
  bytes: i * 1024,
  fullBytes: i * 512,
  partialBytes: i * 512,
  requests: i,
  visitors: 1,
  countries: 1,
}));

const totals = {
  bytes: 10 * 1024 ** 3,
  fullBytes: 8 * 1024 ** 3,
  partialBytes: 2 * 1024 ** 3,
  requests: 1234,
  visitors: 56,
  countries: 7,
};

it("shows 28-day totals for a product", () => {
  render(<UsagePanel days={days} totals={totals} scope="product" />);
  expect(screen.getByText("Past 28 days")).toBeInTheDocument();
  expect(screen.getByText("10 GB")).toBeInTheDocument();
  expect(screen.getByText("Unique visitors")).toBeInTheDocument();
  expect(screen.getByText("56")).toBeInTheDocument();
  expect(screen.getByText("Countries")).toBeInTheDocument();
});

it("accepts recharts 3's string activeTooltipIndex", () => {
  // recharts 3 passes the hover index as a numeric string, not a number.
  expect(parseActiveIndex("5", 28)).toBe(5);
  expect(parseActiveIndex(5, 28)).toBe(5);
  expect(parseActiveIndex(null, 28)).toBeNull();
  expect(parseActiveIndex(undefined, 28)).toBeNull();
  expect(parseActiveIndex("", 28)).toBeNull();
  expect(parseActiveIndex("28", 28)).toBeNull(); // out of bounds
  expect(parseActiveIndex("-1", 28)).toBeNull();
});

it("splits full vs range downloads for an object", () => {
  render(<UsagePanel days={days} totals={totals} scope="object" />);
  expect(screen.getByText("Full downloads")).toBeInTheDocument();
  expect(screen.getByText("8 GB")).toBeInTheDocument();
  expect(screen.getByText("Range requests")).toBeInTheDocument();
  expect(screen.getByText("2 GB")).toBeInTheDocument();
});
