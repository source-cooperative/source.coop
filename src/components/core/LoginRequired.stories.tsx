import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoginRequired } from "./LoginRequired";

/**
 * What an unauthenticated visitor gets instead of a redirect: the sign-in
 * status page, with a button that knows where to send them back to.
 *
 * It is <StatusPage type="unauthenticated"> plus <LoginButton>, kept as its own
 * component so every gated page shows the same thing.
 */
const meta = {
  title: "Feedback/LoginRequired",
  component: LoginRequired,
  parameters: { layout: "padded" },
} satisfies Meta<typeof LoginRequired>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
