import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { AdminTagSuggestions } from "./AdminTagSuggestions";

/**
 * The admin queue of suggested tags. Each suggestion shows who suggested it,
 * the products carrying it, and the approved tags it looks most like.
 * Approving adds it to the list everyone picks from, and rejecting takes it
 * off its products; both happen at once. Merging takes two steps: choosing
 * one or more tags stages the merge and shows what it will change, and
 * nothing happens until **Save merge**. **Reset** goes back to the suggestion
 * as it was. When every word of a suggestion is already a tag, as with
 * `field-boundaries`, one button stages a merge into all of them.
 */
const meta = {
  title: "Features/Admin/AdminTagSuggestions",
  component: AdminTagSuggestions,
  parameters: { layout: "padded" },
  args: {
    approved: [
      { tag: "boundaries", products: 121 },
      { tag: "climate", products: 17 },
      { tag: "crop-type", products: 12 },
      { tag: "crops", products: 12 },
      { tag: "field", products: 115 },
      { tag: "ocean", products: 5 },
      { tag: "remote-sensing", products: 4 },
      { tag: "sentinel-2", products: 25 },
      { tag: "weather", products: 18 },
    ],
    action: async () => ({}),
    suggestions: [
      {
        tag: "crop-types",
        suggested_by: "fiboa",
        suggested_at: "2026-10-12T09:30:00Z",
        products: [
          { account_id: "fiboa", product_id: "de-nrw" },
          { account_id: "fiboa", product_id: "de-sh" },
        ],
        matches: [
          { tag: "crop-type", score: 0.85 },
          { tag: "crops", score: 0.65 },
        ],
      },
      {
        tag: "sea-ice",
        suggested_by: "polar-lab",
        suggested_at: "2026-10-06T14:12:00Z",
        products: [
          { account_id: "polar-lab", product_id: "arctic-extent" },
          { account_id: "polar-lab", product_id: "antarctic-extent" },
        ],
        matches: [],
      },
    ],
  },
} satisfies Meta<typeof AdminTagSuggestions>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Two suggestions. One looks like tags already on the list, so merging is
 * offered first. The other matches nothing, so approving it is the main action.
 */
export const Pending: Story = {};

/** A merge staged and waiting to be saved, with what saving will change. */
export const MergeStaged: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "crop-type" })
    );
  },
};

/** A merge into two tags staged, waiting to be saved or reset. */
export const MergeIntoSeveral: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "crop-type" }));
    await userEvent.click(canvas.getByRole("button", { name: "crops" }));
  },
};

/**
 * Every word of the suggestion is already a tag, so one button stages a
 * merge into all of them.
 */
export const Split: Story = {
  args: {
    suggestions: [
      {
        tag: "field-boundaries",
        suggested_by: "ftw",
        suggested_at: "2026-10-21T10:00:00Z",
        products: [
          { account_id: "ftw", product_id: "ftw-rwanda" },
          { account_id: "ftw", product_id: "ftw-kenya" },
        ],
        matches: [{ tag: "boundaries", score: 0.85 }],
        split: ["field", "boundaries"],
      },
    ],
  },
};

/** The split staged: saving puts both tags in the suggestion's place. */
export const SplitStaged: Story = {
  args: Split.args,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "field + boundaries" })
    );
  },
};

/** A decision the server refused, with its reason. */
export const Refused: Story = {
  args: {
    action: async () => ({ error: '"crop-types" is not awaiting review' }),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getAllByRole("button", { name: "Approve as a new tag" })[0]
    );
  },
};

/** Nothing to review. */
export const Empty: Story = { args: { suggestions: [] } };
