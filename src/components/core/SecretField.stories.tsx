import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SecretField } from "./SecretField";

/**
 * A write-only credential: says whether one is stored, and reveals an input
 * only when you ask to change it.
 *
 * This is the fix for a specific complaint — in edit mode every secret rendered
 * as an empty password box, so the field looked *identical* whether a key was
 * saved or none had ever been set. An admin debugging a broken connection could
 * not answer "is there a key on this?" from the form that owns it.
 *
 * **The transition is the component.** Click Replace… on Stored, then Keep
 * current to back out — neither state tells you much on its own.
 *
 * Nothing secret reaches the browser: `stored` is a boolean derived server-side
 * from the presence of a credential, never from its value.
 */
const meta = {
  title: "Forms/SecretField",
  component: SecretField,
  parameters: { layout: "padded" },
  args: {
    label: "Secret access key",
    help: "Used by the data proxy to read from this bucket.",
    name: "secret_access_key",
    required: false,
    defaultValue: "",
  },
} satisfies Meta<typeof SecretField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A credential exists. It is never shown again, here or anywhere else. */
export const Stored: Story = {
  args: { stored: true },
};

/**
 * Nothing stored, so the input is open from the start and there is no "Keep
 * current" to back out to — there is nothing to keep.
 */
export const NotSet: Story = {
  args: { stored: false, required: true },
};

/**
 * After a failed submit: the typed value survives, so the field opens on it
 * rather than reverting to Stored and silently discarding what was entered.
 */
export const RetainedAfterFailedSubmit: Story = {
  args: { stored: true, defaultValue: "typed-but-not-saved" },
};

export const WithError: Story = {
  args: {
    stored: false,
    required: true,
    errors: ["Secret access key is required for this authentication method"],
  },
};
