import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { AdminReviewedTags } from "./AdminReviewedTags";

/**
 * Suggested tags an admin has decided, on the admin tags page, most recent
 * first: what was decided, who decided and when. **Undo** puts a tag back
 * awaiting review. Undoing a merge or rejection also reverses what it did to
 * products: the tag goes back on each product it was taken off, and the tags
 * a merge added come off again, unless the product had them before.
 */
const meta = {
  title: "Features/Admin/AdminReviewedTags",
  component: AdminReviewedTags,
  parameters: { layout: "padded" },
  args: {
    action: async () => ({}),
    reviewed: [
      {
        tag: "field-boundaries",
        outcome: "merged",
        merged_into: ["field", "boundaries"],
        suggested_by: "ftw",
        reviewed_by: "alukach",
        reviewed_at: "2026-10-27T15:04:00Z",
        products: 3,
      },
      {
        tag: "sea-ice",
        outcome: "approved",
        suggested_by: "polar-lab",
        reviewed_by: "alukach",
        reviewed_at: "2026-10-26T11:20:00Z",
        products: 2,
      },
      {
        tag: "asdf-foo-bar",
        outcome: "rejected",
        suggested_by: "alukach",
        reviewed_by: "alukach",
        reviewed_at: "2026-10-25T09:00:00Z",
        products: 1,
      },
    ],
  },
} satisfies Meta<typeof AdminReviewedTags>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An approval, a merge into two tags, and a rejection. */
export const Reviewed: Story = {};

/** An undo the server refused, with its reason. */
export const UndoRefused: Story = {
  args: { action: async () => ({ error: '"sea-ice" has no decision to undo' }) },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getAllByRole("button", { name: "Undo" })[1]);
  },
};

/** Nothing has been reviewed yet. */
export const Empty: Story = { args: { reviewed: [] } };
