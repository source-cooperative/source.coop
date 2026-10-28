import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import type { TagCategory } from "@/lib/tags/categories";
import { TagPicker } from "./TagPicker";

const categories: Record<string, TagCategory> = {
  acoustics: "methodology",
  bathymetry: "feature-type",
  cetaceans: "domain",
  climate: "domain",
  hydrophone: "sensor",
  "remote-sensing": "methodology",
};
const options = Object.keys(categories);

const openAndFilter = async (canvasElement: HTMLElement, text: string) => {
  await userEvent.click(
    within(canvasElement).getByRole("button", { name: /tags$/ })
  );
  // The list is portalled, so it renders outside the story's canvas.
  await userEvent.type(
    within(document.body).getByPlaceholderText("Filter tags"),
    text
  );
};

/**
 * Choosing a product's tags. Chosen tags show as chips, with "Edit tags" on
 * its own line below them. The button opens a
 * list of every approved tag, grouped under its category with a line saying
 * what the category covers, and a box to filter it; ticking one adds it.
 * When no tag fits, the filter text can be suggested as a new tag. It shows as
 * a new chip, and is only sent for review when the product is saved, so
 * leaving without saving suggests nothing. Each chosen tag is submitted as its
 * own `tags` form value, and each new one as a `suggest_tags` value.
 */
const meta = {
  title: "Features/Settings/Products/TagPicker",
  component: TagPicker,
  parameters: { layout: "padded" },
  args: { name: "tags", options, categories, suggestName: "suggest_tags" },
} satisfies Meta<typeof TagPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new product starts with no tags. */
export const Empty: Story = {};

/** An existing product's tags show as chips that can be removed. */
export const WithTags: Story = {
  args: { defaultValue: ["acoustics", "cetaceans"] },
};

/**
 * A tag the corpus no longer has stays on the product until someone removes
 * it, so editing other details never forces it off.
 */
export const RetiredTag: Story = {
  args: { defaultValue: ["acoustics", "deep-sea-legacy"] },
};

/**
 * The list open: the product's own tags first, then every other tag under its
 * category, in the order categories always come in.
 */
export const Grouped: Story = {
  args: { defaultValue: ["acoustics"] },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Edit tags" }));
  },
};

/**
 * A tag ticked with the list open joins the product's tags at the top straight
 * away, and stays ticked in its category too, so the row just clicked doesn't
 * move. The new chip appears above the button, which stays where it was.
 */
export const Ticking: Story = {
  args: { defaultValue: ["acoustics"] },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Edit tags" }));
    await userEvent.click(within(document.body).getByRole("option", { name: "cetaceans" }));
  },
};

/** The list narrowed by the filter box, which matches across categories. */
export const Filtering: Story = {
  args: { defaultValue: ["acoustics"] },
  play: ({ canvasElement }) => openAndFilter(canvasElement, "c"),
};

/**
 * No tag fits, so the list offers to suggest the filter text as a new one, in
 * the spelling tags are stored in. The offer also appears when other tags only
 * partly match.
 */
export const Suggesting: Story = {
  args: { defaultValue: ["acoustics"] },
  play: ({ canvasElement }) => openAndFilter(canvasElement, "Sea Ice"),
};

/**
 * A tag suggested but not yet saved. It shows as new, with a reminder that it
 * is only suggested once the product is saved.
 */
export const NewTag: Story = {
  args: { defaultValue: ["acoustics"] },
  play: async ({ canvasElement }) => {
    await openAndFilter(canvasElement, "Sea Ice");
    await userEvent.click(
      within(document.body).getByRole("option", { name: /^Suggest/ })
    );
  },
};

/** A tag suggested in an earlier save, waiting for an admin's review. */
export const PendingTag: Story = {
  args: { defaultValue: ["acoustics", "sea-ice"], pending: ["sea-ice"] },
};

/**
 * Recommended tags, read from the product's data. Source Cooperative's
 * metadata catalog reads keywords from each product's objects, and a line
 * under the product's tags says how many it recommends. Keywords already on
 * the product aren't counted.
 */
export const Recommended: Story = {
  args: {
    defaultValue: ["acoustics"],
    recommended: ["Cetacean", "hydrophones", "climate", "marine-mammals", "acoustics"],
  },
};

/**
 * **Review** opens the tag list with the recommendations first. A keyword
 * spelled differently from an approved tag, or in the plural, adds that tag;
 * one whose words are each tags adds all of them, as `field-boundaries` adds
 * `field` and `boundaries`; anything else is suggested for review, marked
 * new. Each toggles like any tag, and the group's link adds every existing
 * tag at once, leaving new ones to be chosen one by one so nothing reaches
 * the review queue unasked.
 */
export const RecommendedOpen: Story = {
  args: Recommended.args,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Review" }));
  },
};
