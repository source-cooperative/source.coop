import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProfileLocation } from "./ProfileLocation";

/** Where an account says it is, with a globe beside it. */
const meta = {
  title: "Profiles/ProfileLocation",
  component: ProfileLocation,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProfileLocation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { location: "Knoxville, Tennessee" },
};

/** Free text, so it can be as long as someone types. */
export const Long: Story = {
  args: {
    location: "Department of Geography and Sustainability, Knoxville, Tennessee",
  },
};
