// Shared analytics styling constants. Deliberately NOT a "use client"
// module: server components (the admin page) call mono() and read HELP,
// and client-module exports can't be invoked across the RSC boundary.
import type { CSSProperties } from "react";

export const HELP = {
  downloads: "Number of successful downloads.",
  served: "Total bytes downloaded.",
  bandwidth: "Data served divided by the elapsed time in the range.",
  requests: "Successful data requests (GET, status 200/206).",
  countries: "Distinct countries requests originated from.",
  dailyAvg: "Average downloads per day over the period.",
  uniqueIps: "Distinct IP addresses that downloaded data in this period.",
  registered: "Distinct signed-in users who downloaded data in this period.",
  anon: "Download requests made without a signed-in user.",
  frequency:
    "How many times each unique IP address downloaded data in this period.",
  distribution:
    "Histogram over the same population: how many unique IP addresses (y) made a given number of downloads (x) in this period.",
};

export const mono = (extra?: CSSProperties): CSSProperties => ({
  fontFamily: "var(--code-font-family)",
  ...extra,
});
