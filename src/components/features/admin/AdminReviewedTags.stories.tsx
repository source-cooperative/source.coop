import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { AdminReviewedTags } from "./AdminReviewedTags";
import { storyAccounts } from "@/components/core/story-accounts";

/**
 * Suggested tags an admin has decided, on the admin tags page, most recent
 * first: what was decided, who decided and when, and the products the tag
 * was on, each linked. **Undo** puts a tag back
 * awaiting review. Undoing a merge or rejection also reverses what it did to
 * products: the tag goes back on each product it was taken off, and the tags
 * a merge added come off again, unless the product had them before.
 */
const meta = {
  title: "Features/Admin/AdminReviewedTags",
  component: AdminReviewedTags,
  parameters: { layout: "padded" },
  args: {
    accounts: storyAccounts,
    action: async () => ({}),
    reviewed: [
      {
        tag: "field-boundaries",
        outcome: "merged",
        merged_into: ["field", "boundaries"],
        suggested_by: "ftw",
        reviewed_by: "alukach",
        reviewed_at: "2026-10-27T15:04:00Z",
        products: [
          { account_id: "ftw", product_id: "fields-of-the-world" },
          { account_id: "fiboa", product_id: "austria" },
          { account_id: "fiboa", product_id: "belgium" },
        ],
      },
      {
        tag: "sea-ice",
        outcome: "approved",
        suggested_by: "polar-lab",
        reviewed_by: "alukach",
        reviewed_at: "2026-10-26T11:20:00Z",
        products: [
          { account_id: "polar-lab", product_id: "arctic-ice-extent" },
          { account_id: "polar-lab", product_id: "antarctic-sea-ice" },
        ],
      },
      {
        tag: "asdf-foo-bar",
        outcome: "rejected",
        suggested_by: "alukach",
        reviewed_by: "alukach",
        reviewed_at: "2026-10-25T09:00:00Z",
        products: [{ account_id: "alukach", product_id: "dynamical-dwd-icon-eu" }],
      },
    ],
  },
} satisfies Meta<typeof AdminReviewedTags>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An approval, a merge into two tags, and a rejection. */
export const Reviewed: Story = {};

/**
 * Every name links to the account, and hovering it shows the account's card:
 * here, the admin who merged `field-boundaries`.
 */
export const AccountCard: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getAllByRole("link", { name: "alukach" })[0]);
  },
};

/** An undo the server refused, with its reason. */
export const UndoRefused: Story = {
  args: { action: async () => ({ error: '"sea-ice" has no decision to undo' }) },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getAllByRole("button", { name: "Undo" })[1]);
  },
};

/** Nothing has been reviewed yet. */
export const Empty: Story = { args: { reviewed: [] } };
