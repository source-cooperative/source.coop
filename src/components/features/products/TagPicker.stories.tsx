import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
 * Choosing a product's tags. Only tags from the known corpus can be added:
 * typing suggests them, and picking one adds it. Each chosen tag is submitted
 * as its own `tags` form value.
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

/** Every tag in the corpus is already chosen, so there is nothing to add. */
export const AllChosen: Story = {
  args: { defaultValue: options },
};
