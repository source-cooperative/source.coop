import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ApiKeyExpiryField } from "./ApiKeyExpiryField";

/**
 * How long an API key lasts, counted from now: 30 days, 90 days, a year, or
 * until it is revoked. Issuing a key starts at 90 days; changing the expiry of
 * a key that never expires starts at never.
 */
const meta = {
  title: "Features/Service accounts/ApiKeyExpiryField",
  component: ApiKeyExpiryField,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ApiKeyExpiryField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { id: "expiry" } };

/** A key that already never expires. */
export const Never: Story = { args: { id: "expiry", never: true } };
