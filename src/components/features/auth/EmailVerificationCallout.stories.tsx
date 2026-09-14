import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EmailVerificationCallout } from "./EmailVerificationCallout";

/**
 * The banner every signed-in page carries until the account's email is
 * confirmed. `VerificationBanner` decides which of the two states to show — it
 * reads the session and the account record, so it has no story of its own; this
 * is the half that draws them.
 */
const meta = {
  title: "Features/Auth/EmailVerificationCallout",
  component: EmailVerificationCallout,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EmailVerificationCallout>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Signed in, email still unconfirmed: the link starts Ory's verification flow. */
export const Unverified: Story = {
  args: { status: "unverified" },
};

/**
 * Shown once, on the first page load after the address is confirmed. The next
 * load reads the synced account record and the banner disappears.
 */
export const JustVerified: Story = {
  args: { status: "just-verified" },
};
