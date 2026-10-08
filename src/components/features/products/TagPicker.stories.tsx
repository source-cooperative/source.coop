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

/**
 * Choosing a product's tags. Chosen tags show as chips; "Edit tags" opens a
 * list of every tag in the known corpus, with a box to filter it, and ticking
 * one adds it. Only corpus tags can be added. Each chosen tag is submitted as
 * its own `tags` form value.
 */
const meta = {
  title: "Features/Settings/Details/TagPicker",
  component: TagPicker,
  parameters: { layout: "padded" },
  args: { name: "tags", options },
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
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Edit tags" })
    );
    // The list is portalled, so it renders outside the story's canvas.
    await userEvent.type(
      within(document.body).getByPlaceholderText("Filter tags"),
      "c"
    );
  },
};
