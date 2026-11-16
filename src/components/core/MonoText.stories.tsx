import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MonoText } from "./MonoText";

/**
 * Text in the code face, for things that are typed rather than written:
 * handles, ids, bucket names, prefixes.
 *
 * It is a one-line wrapper over Radix's Text, and exists so the font is chosen
 * in one place — the face is a `--code-font-family` var, not a literal, so the
 * story is also the check that the webfont actually loaded.
 */
const meta = {
  title: "Components/Typography/MonoText",
  component: MonoText,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MonoText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "miskatonic/abyssal-acoustics" },
};
