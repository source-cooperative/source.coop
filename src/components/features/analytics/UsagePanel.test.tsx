import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Theme } from "@radix-ui/themes";
import { UsagePanel, parseActiveIndex } from "./UsagePanel";
import type { UsagePoint, UsageUsers } from "@/lib/clients/analytics";

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

const users: UsageUsers = {
  uniqueIps: 555,
  registered: 532,
  anonRequests: 12030,
  frequency: [
    { label: "1×", count: 520 },
    { label: "2–5×", count: 9 },
    { label: "6–20×", count: 2 },
    { label: "20×+", count: 1 },
  ],
};

it("shows window downloads, data served, and countries", () => {
  renderPanel(<UsagePanel days={days} totals={totals} users={users} />);
  expect(screen.getByText("Downloads")).toBeInTheDocument();
  expect(screen.getByText("12,847")).toBeInTheDocument();
  expect(screen.getByText("Data served")).toBeInTheDocument();
  expect(screen.getByText("10 GB")).toBeInTheDocument();
  expect(screen.getByText("Countries")).toBeInTheDocument();
  expect(screen.getByText("42")).toBeInTheDocument();
  expect(screen.getByText("30-day downloads")).toBeInTheDocument();
});

it("renders downloads content without a tab selector for public viewers", () => {
  renderPanel(<UsagePanel days={days} totals={totals} />);
  expect(screen.queryByRole("tab")).toBeNull();
  expect(screen.getByText("Downloads")).toBeInTheDocument();
  expect(screen.getByText("12,847")).toBeInTheDocument();
  expect(screen.queryByText("Registered")).toBeNull();
});

it("shows registered/anon usage and frequency on the Users tab", async () => {
  renderPanel(<UsagePanel days={days} totals={totals} users={users} />);
  await userEvent.click(screen.getByRole("tab", { name: /users/i }));
  expect(screen.getByText("Unique IPs")).toBeInTheDocument();
  expect(screen.getByText("555")).toBeInTheDocument();
  expect(screen.getByText("Registered")).toBeInTheDocument();
  expect(screen.getByText("532")).toBeInTheDocument();
  expect(screen.getByText("Anon requests")).toBeInTheDocument();
  expect(screen.getByText("~12k")).toBeInTheDocument();
  expect(screen.getByText("2–5×")).toBeInTheDocument();
  expect(screen.getByText("520")).toBeInTheDocument();
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
