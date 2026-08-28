import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AccountSearchInput } from "./AccountSearchInput";

/**
 * Account picker: type part of a handle or display name and choose from the
 * matches, each rendered as the same identity card the profile hover card
 * shows. The handle is what gets submitted.
 *
 * **Type two or more characters to see the list** — `searchAccounts` is mocked
 * in `.storybook/preview.tsx`, so the suggestions here are fixed rather than a
 * real lookup. Without that mock the component throws on mount: the action is
 * `"use server"` and brings the AWS SDK with it.
 *
 * Worth exercising with the keyboard. Focus never leaves the input — it owns
 * `aria-activedescendant` — and the list portals out of its container, which is
 * what stops it being clipped inside the invite dialog.
 */
const meta = {
  title: "Components/Forms/AccountSearchInput",
  component: AccountSearchInput,
  parameters: { layout: "padded" },
  args: { name: "account_id" },
} satisfies Meta<typeof AccountSearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "Search by username or name" },
};

export const Required: Story = {
  args: { placeholder: "Search by username or name", required: true },
};

/** Editing an existing value rather than starting empty. */
export const Prefilled: Story = {
  args: { defaultValue: "cholmes" },
};
