import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoginButton } from "./LoginButton";

/**
 * Sign-in link that returns you to the page you were on.
 *
 * A plain `<a>`, not next/link: login lives on the Ory flow, an external domain
 * in production, so it has to be a full page navigation. The `return_to` is
 * filled in after mount, which is why the href in this frame points at the
 * Storybook URL rather than the app.
 */
const meta = {
  title: "Controls/LoginButton",
  component: LoginButton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof LoginButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabel: Story = {
  args: { children: "Sign in" },
};
