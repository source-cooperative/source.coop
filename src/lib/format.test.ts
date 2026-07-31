import { formatRelativeTime } from "./format";

describe("formatRelativeTime", () => {
  const now = new Date("2024-06-15T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it.each([
    [ago(30_000), "30 seconds ago"],
    [ago(5 * 60_000), "5 minutes ago"],
    [ago(3 * 3600_000), "3 hours ago"],
    [ago(2 * 24 * 3600_000), "2 days ago"],
    [ago(21 * 24 * 3600_000), "3 weeks ago"],
    [ago(400 * 24 * 3600_000), "last year"],
  ])("%s -> %s", (date, expected) => {
    expect(formatRelativeTime(date, now)).toBe(expected);
  });

  it("returns empty string for an unparseable date", () => {
    expect(formatRelativeTime("not a date", now)).toBe("");
  });
});
