import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusPage } from "./StatusPage";

/**
 * The three dead ends: not found, not allowed, not signed in.
 *
 * One component rather than three pages so they cannot drift into three
 * different-looking apologies. `minHeight` is dropped to `auto` here — the
 * default centres in 60vh, which in a story frame is mostly empty space.
 */
const meta = {
  title: "Components/Feedback/StatusPage",
  component: StatusPage,
  parameters: { layout: "padded" },
  args: { minHeight: "auto" },
} satisfies Meta<typeof StatusPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotFound: Story = {
  args: { type: "not-found" },
};

export const NotAuthorized: Story = {
  args: { type: "not-authorized" },
};

export const Unauthenticated: Story = {
  args: { type: "unauthenticated" },
};

/** Callers can replace any of it; the icon is what stays. */
export const CustomCopy: Story = {
  args: {
    type: "not-found",
    title: "No such product",
    description: "This account has no product by that name.",
    actionText: "Back to the account",
    actionHref: "/",
  },
};

export const WithoutAction: Story = {
  args: { type: "not-authorized", showAction: false },
};
