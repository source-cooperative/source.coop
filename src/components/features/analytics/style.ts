// Shared analytics styling constants. Deliberately NOT a "use client"
// module: server components (the admin page) call mono() and read HELP,
// and client-module exports can't be invoked across the RSC boundary.
import type { CSSProperties } from "react";

// Reader-facing copy: plain language, no internals. These tooltips are read
// by people publishing data, not by people who know how the numbers are
// collected — the caveats are stated as what to expect, not as mechanics.
export const HELP = {
  window:
    "Dates are UTC days. The range covers the most recent full days plus today so far.",
  served: "Total amount of data sent.",
  bandwidth: "Average rate that data was sent over this range.",
  requests:
    "Requests that successfully returned data. A request can return a whole file or only part of one, so tools that read a file in parts, such as map viewers, make many requests for one file.",
  countries: "How many different countries requests came from.",
  dailyAvg: "Average requests per day over the period.",
  uniqueIps:
    "How many different IP addresses requested data. Everyone sharing a network — an office, a university, a cloud provider — counts once, and very busy products may count a little low.",
  // Product-page uniques are counted in weekly slices to keep them exact;
  // the admin explorer usually scans everything at once, so its number is
  // measured from a sample and undercounts more the wider the range gets.
  uniqueIpsSampled:
    "How many different IP addresses appear in this range. Busy ranges are measured from a sample, so this undercounts — the wider the range, the more it undercounts.",
  registered: "Requests by signed-in users.",
  anon: "Requests with no signed-in user.",
  distribution:
    "How many IP addresses made one request, two, and so on. The line adds them up left to right, so at any bar it shows the share that made that many requests or fewer.",
};

export const mono = (extra?: CSSProperties): CSSProperties => ({
  fontFamily: "var(--code-font-family)",
  ...extra,
});
