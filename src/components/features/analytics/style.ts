// Shared analytics styling constants. Deliberately NOT a "use client"
// module: server components (the admin page) call mono(), and client-module
// exports can't be invoked across the RSC boundary.
//
// Tooltip copy lives in the "AnalyticsHelp" message namespace. It is
// reader-facing: plain language, no internals. These tooltips are read by
// people publishing data, not by people who know how the numbers are
// collected — the caveats are stated as what to expect, not as mechanics.
// The admin explorer's unique-IP count ("uniqueIpsSampled") differs from the
// product page's because product-page uniques are counted in weekly slices to
// keep them exact, while the admin explorer usually scans everything at once
// and so measures from a sample that undercounts more the wider the range.
import type { CSSProperties } from "react";

export const mono = (extra?: CSSProperties): CSSProperties => ({
  fontFamily: "var(--code-font-family)",
  ...extra,
});
