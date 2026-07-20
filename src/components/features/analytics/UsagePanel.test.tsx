import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { UsagePanel, parseActiveIndex } from "./UsagePanel";
import type { UsagePoint } from "@/lib/clients/analytics";

// Radix Tooltip needs the Theme provider (the app supplies it at the root).
const renderPanel = (ui: React.ReactElement) => render(<Theme>{ui}</Theme>);

// recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const days: UsagePoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 5, 7 + i)).toISOString(),
  bytes: i * 1024,
  requests: i,
  countries: 1,
}));

const totals = { bytes: 10 * 1024 ** 3, requests: 12847, countries: 42 };

it("shows window downloads, data served, and countries", () => {
  renderPanel(<UsagePanel days={days} totals={totals} />);
  expect(screen.getByText("Downloads")).toBeInTheDocument();
  expect(screen.getByText("12,847")).toBeInTheDocument();
  expect(screen.getByText("Data served")).toBeInTheDocument();
  expect(screen.getByText("10 GB")).toBeInTheDocument();
  expect(screen.getByText("Countries")).toBeInTheDocument();
  expect(screen.getByText("42")).toBeInTheDocument();
  expect(screen.getByText("30-day downloads")).toBeInTheDocument();
});

it("renders no tab selector or users content in the card", () => {
  renderPanel(<UsagePanel days={days} totals={totals} />);
  expect(screen.queryByRole("tab")).toBeNull();
  expect(screen.queryByText("Registered")).toBeNull();
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
