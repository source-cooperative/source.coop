import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LocaleSwitcher } from "./LocaleSwitcher";

/**
 * The language picker in the footer. Each language is listed in its own
 * script, so a reader who can't read the current page can still find theirs.
 *
 * The choice is remembered in a cookie; without one, the site follows the
 * browser's language preference. Switch the story's language from the
 * toolbar to see the trigger follow it.
 */
const meta = {
  title: "Features/App shell/LocaleSwitcher",
  component: LocaleSwitcher,
  parameters: { layout: "padded" },
} satisfies Meta<typeof LocaleSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shows the language the page is rendered in. */
export const Default: Story = {};
