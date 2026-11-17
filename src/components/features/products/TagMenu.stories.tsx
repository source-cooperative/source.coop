import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Box } from "@radix-ui/themes";
import { TagMenu } from "./TagMenu";

/**
 * The list inside the tag pickers' popovers: a search field over grouped
 * tags. **↑** and **↓** move the highlight, which the mouse moves too, and
 * **Enter** chooses the highlighted row, so a tag can be found and picked
 * without leaving the keyboard. The tag picker on the product form lists the
 * product's own tags first, checked; the admin merge picker lists a
 * suggestion's close matches first, with how many products carry each tag.
 */
const meta = {
  title: "Features/Products/TagMenu",
  component: TagMenu,
  parameters: { layout: "centered" },
  args: {
    query: "",
    onQueryChange: () => {},
    placeholder: "Find an approved tag",
    onChoose: () => {},
    empty: "No approved tag matches.",
    sections: [],
  },
  render: function Render(args) {
    const [query, setQuery] = useState(args.query);
    return (
      <Box width="320px" style={{ border: "1px solid var(--gray-a6)" }}>
        <TagMenu {...args} query={query} onQueryChange={setQuery} />
      </Box>
    );
  },
} satisfies Meta<typeof TagMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Choosing one tag, as the admin merge picker does: close matches first. */
export const MergeTargets: Story = {
  args: {
    hint: "Nothing changes until you save",
    sections: [
      {
        title: "Close matches",
        items: [
          { tag: "boundaries", detail: "113 products" },
          { tag: "borders", detail: "4 products" },
        ],
      },
      {
        title: "All tags",
        items: [
          { tag: "aerosols", detail: "2 products" },
          { tag: "agriculture", detail: "75 products" },
          { tag: "antarctica", detail: "1 product" },
          { tag: "bathymetry", detail: "2 products" },
          { tag: "biodiversity", detail: "8 products" },
        ],
      },
    ],
  },
};

/**
 * Toggling several, as the product form's tag picker does: the product's
 * tags first and checked, and a last row suggesting a tag the list lacks.
 */
export const ProductTags: Story = {
  args: {
    multiple: true,
    query: "sea",
    placeholder: "Filter tags",
    empty: "No tag matches.",
    sections: [
      { title: "On this product", items: [{ tag: "sea-ice", selected: true }] },
      {
        title: "Matching “sea”",
        items: [{ tag: "sea-level" }, { tag: "sea-surface-temperature" }],
      },
    ],
    action: { label: "Suggest “sea” as a new tag", onChoose: () => {} },
  },
};

/** Nothing matches the search and nothing can be suggested. */
export const NoMatch: Story = {
  args: { query: "zzz", empty: "No approved tag matches “zzz”." },
};
