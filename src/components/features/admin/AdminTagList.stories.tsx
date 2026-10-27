import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { AdminTagList } from "./AdminTagList";

/**
 * Every approved tag on the admin tags page, most used first, with how many
 * products carry each and where it came from: who suggested it and which
 * admin approved it, or the original cleanup that seeded the list.
 */
const meta = {
  title: "Features/Admin/AdminTagList",
  component: AdminTagList,
  parameters: { layout: "padded" },
  args: {
    tags: [
      { tag: "field boundaries", products: 113 },
      { tag: "geoparquet", products: 101 },
      { tag: "sentinel-2", products: 25 },
      {
        tag: "sea ice",
        products: 2,
        suggested_by: "polar-lab",
        approved_by: "alukach",
        approved_at: "2026-10-27T15:04:00Z",
      },
      { tag: "climate", products: 17 },
      { tag: "ocean", products: 5 },
    ],
  },
} satisfies Meta<typeof AdminTagList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Seeded tags and one approved from a suggestion. */
export const AllTags: Story = {};

/** Narrowed by the filter box. */
export const Filtered: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(
      within(canvasElement).getByPlaceholderText("Filter 6 tags"),
      "ice"
    );
  },
};

/** Before any tag has been approved or seeded. */
export const Empty: Story = { args: { tags: [] } };
