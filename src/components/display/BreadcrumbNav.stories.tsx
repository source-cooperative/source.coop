import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BreadcrumbNav } from "./BreadcrumbNav";

/**
 * Where you are inside a product's objects, and the way back up.
 *
 * The last segment is deliberately not a link when it is the current
 * directory — it goes where you already are — but it becomes one as soon as a
 * `fileName` sits below it.
 *
 * Deep paths truncate to the first two and last two segments with an ellipsis
 * between. That rule only shows itself past four segments, which is exactly
 * the case a real product rarely gives you on demand.
 */
const meta = {
  title: "Features/Object browser/BreadcrumbNav",
  component: BreadcrumbNav,
  parameters: { layout: "padded" },
  args: { baseUrl: "/miskatonic/abyssal-acoustics" },
} satisfies Meta<typeof BreadcrumbNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At the root, "root" is plain text rather than a link back to itself. */
export const Root: Story = {
  args: { path: [] },
};

export const OneLevel: Story = {
  args: { path: ["recordings"] },
};

/** Four segments still fit; nothing is elided. */
export const AtTheTruncationLimit: Story = {
  args: { path: ["recordings", "2019", "site-a", "raw"] },
};

/** Past four, so the middle collapses to an ellipsis. */
export const Truncated: Story = {
  args: {
    path: ["recordings", "2019", "site-a", "raw", "flac", "hydrophone-3"],
  },
};

/**
 * Viewing a file: the directory that contains it becomes a link, because it is
 * somewhere you can now go back to.
 */
export const OnAFile: Story = {
  args: {
    path: ["recordings", "2019"],
    fileName: "site-a-20190712-0800.flac",
  },
};

/** A single segment long enough to crowd the row. */
export const LongSegment: Story = {
  args: {
    path: ["continuous-passive-acoustic-monitoring-deployments-2019-2024"],
  },
};
