import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { screen, userEvent, within } from "storybook/test";
import { AdminTagList } from "./AdminTagList";
import { storyAccounts } from "@/components/core/story-accounts";

/**
 * Every approved tag on the admin tags page, most used first, with how many
 * products carry each and where it came from: who suggested it and which
 * admin approved it, or the initial import that seeded the list. Each tag
 * links to the product list filtered by it.
 *
 * **Change** replaces a tag on every product that carries it. Choose one tag
 * to merge it into, several to split it, or type a name the list lacks to
 * rename it. With nothing chosen, **Remove** takes it off them. The products
 * change all at once, or not at all if one was saved meanwhile, and the
 * decision appears under Reviewed, where it can be undone.
 */
const meta = {
  title: "Features/Admin/AdminTagList",
  component: AdminTagList,
  parameters: { layout: "padded" },
  args: {
    accounts: storyAccounts,
    action: async () => ({}),
    tags: [
      { tag: "field-boundaries", products: 113 },
      { tag: "geoparquet", products: 101 },
      { tag: "sentinel-2", products: 25 },
      {
        tag: "sea-ice",
        products: 2,
        suggested_by: "polar-lab",
        reviewed_by: "alukach",
        reviewed_at: "2026-10-27T15:04:00Z",
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

const openChange = async (canvasElement: HTMLElement, tag: string) => {
  const row = within(canvasElement).getByRole("rowheader", { name: tag }).closest("tr")!;
  await userEvent.click(within(row).getByRole("button", { name: "Change" }));
  return within(await screen.findByRole("dialog", { name: `Change ${tag}` }));
};

/** A tag's Change popover, with nothing chosen yet: every other tag, and Remove. */
export const Change: Story = {
  play: async ({ canvasElement }) => {
    await openChange(canvasElement, "ocean");
  },
};

/** `field-boundaries` split into two new tags, typed by name. */
export const Split: Story = {
  play: async ({ canvasElement }) => {
    const popover = await openChange(canvasElement, "field-boundaries");
    const find = popover.getByPlaceholderText("Find a tag, or type a new name");
    await userEvent.type(find, "Field");
    await userEvent.click(popover.getByRole("option", { name: "Rename to “field”" }));
    await userEvent.type(find, "boundaries");
    await userEvent.click(popover.getByRole("option", { name: "Add new tag “boundaries”" }));
  },
};

/** A change refused because a product was saved while it was being applied. */
export const Refused: Story = {
  args: {
    action: async () => ({
      error:
        '"ocean", a tag it merges into, or one of its products changed while this was being saved, so nothing was changed. Reload and try again.',
    }),
  },
  play: async ({ canvasElement }) => {
    const popover = await openChange(canvasElement, "ocean");
    await userEvent.click(popover.getByRole("option", { name: /climate/ }));
    await userEvent.click(popover.getByRole("button", { name: "Save" }));
  },
};

/** Before any tag has been approved or seeded. */
export const Empty: Story = { args: { tags: [] } };
