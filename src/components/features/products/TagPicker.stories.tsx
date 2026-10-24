import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { TagPicker } from "./TagPicker";

const options = [
  "acoustics",
  "bathymetry",
  "cetaceans",
  "climate",
  "hydrophone",
  "remote-sensing",
];

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
 * Choosing a product's tags. Chosen tags show as chips; "Edit tags" opens a
 * list of every approved tag, with a box to filter it, and ticking one adds it.
 * When no tag fits, the filter text can be suggested as a new tag: it goes on
 * the product straight away, marked pending until an admin reviews it. Each
 * chosen tag is submitted as its own `tags` form value.
 */
const meta = {
  title: "Features/Settings/Details/TagPicker",
  component: TagPicker,
  parameters: { layout: "padded" },
  args: {
    name: "tags",
    options,
    onSuggest: async (
      tag: string
    ): Promise<{ tag: string } | { error: string }> => ({
      tag: tag.trim().toLowerCase(),
    }),
  },
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

/** The list open, narrowed by the filter box. */
export const Filtering: Story = {
  args: { defaultValue: ["acoustics"] },
  play: ({ canvasElement }) => openAndFilter(canvasElement, "c"),
};

/**
 * No tag fits, so the list offers to suggest the filter text as a new one.
 * The offer also appears when other tags only partly match.
 */
export const Suggesting: Story = {
  args: { defaultValue: ["acoustics"] },
  play: ({ canvasElement }) => openAndFilter(canvasElement, "sea ice"),
};

/** A suggested tag is on the product but hasn't been reviewed yet. */
export const PendingTag: Story = {
  args: { defaultValue: ["acoustics", "sea ice"], pending: ["sea ice"] },
};

/** A suggestion the server refused, with its reason. */
export const SuggestionRefused: Story = {
  args: {
    onSuggest: async () => ({
      error:
        "You have 5 tags awaiting review. Suggest more once they've been reviewed.",
    }),
  },
  play: async ({ canvasElement }) => {
    await openAndFilter(canvasElement, "sea ice");
    await userEvent.click(
      within(document.body).getByRole("button", { name: /^Suggest/ })
    );
  },
};
