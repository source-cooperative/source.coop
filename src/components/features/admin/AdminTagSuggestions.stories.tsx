import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AdminTagSuggestions } from "./AdminTagSuggestions";

/**
 * The admin queue of suggested tags. Each suggestion shows who suggested it
 * and the products carrying it. Approve adds it to the list everyone picks
 * from. Merge replaces it with an approved tag on every one of those products.
 * Reject takes it off them.
 */
const meta = {
  title: "Features/Admin/AdminTagSuggestions",
  component: AdminTagSuggestions,
  parameters: { layout: "padded" },
  args: {
    approved: ["climate", "ocean", "remote sensing", "sentinel-2"],
    action: async () => {},
  },
} satisfies Meta<typeof AdminTagSuggestions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two suggestions waiting, one already on two products. */
export const Pending: Story = {
  args: {
    suggestions: [
      {
        tag: "sea ice",
        suggested_by: "polar-lab",
        suggested_at: "2026-10-06T14:12:00Z",
        products: [
          { account_id: "polar-lab", product_id: "arctic-extent" },
          { account_id: "polar-lab", product_id: "antarctic-extent" },
        ],
      },
      {
        tag: "sst",
        suggested_by: "noaa",
        suggested_at: "2026-10-08T09:30:00Z",
        products: [{ account_id: "noaa", product_id: "oisst" }],
      },
    ],
  },
};

/** A suggestion whose product later dropped it. */
export const Unused: Story = {
  args: {
    suggestions: [
      { tag: "ocean heatwaves", suggested_by: "alice", products: [] },
    ],
  },
};

/** Nothing to review. */
export const Empty: Story = { args: { suggestions: [] } };
