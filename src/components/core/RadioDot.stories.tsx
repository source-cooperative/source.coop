import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flex, Radio, Text } from "@radix-ui/themes";
import { RadioDot } from "./DynamicForm";

/**
 * The selection dot Radix's `RadioCards` leaves out.
 *
 * RadioCards conveys selection with the card border alone — a cue that carries
 * no shape, only weight, so it is easy to miss and it vanishes in grayscale.
 *
 * This redraws the indicator from `<Radio variant="surface">` using Radix's own
 * public tokens rather than overriding a Radix class. **That claim is what this
 * story is for:** the comparison below puts `RadioDot` next to the real thing,
 * so a Radix upgrade that changes the radio shows up here as a mismatch instead
 * of quietly drifting.
 *
 * It is decorative — `RadioCards.Item` is still the radio, so this is
 * `aria-hidden` and never becomes a second control.
 */
const meta = {
  title: "Core/Forms/RadioDot",
  component: RadioDot,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RadioDot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checked: Story = {
  args: { checked: true },
};

export const Unchecked: Story = {
  args: { checked: false },
};

export const Disabled: Story = {
  args: { checked: true, disabled: true },
};

/**
 * Side by side with Radix's own radio. These should be indistinguishable in
 * every row; if they are not, the token set has moved.
 */
export const AgainstRadixRadio: Story = {
  args: { checked: true },
  render: () => (
    <Flex direction="column" gap="3">
      <Flex align="center" gap="6">
        <Flex align="center" gap="2" width="120px">
          <RadioDot checked />
          <Text size="1" color="gray">
            RadioDot
          </Text>
        </Flex>
        <Flex align="center" gap="2">
          <Radio variant="surface" value="on" checked readOnly />
          <Text size="1" color="gray">
            Radix Radio
          </Text>
        </Flex>
      </Flex>
      <Flex align="center" gap="6">
        <Flex align="center" gap="2" width="120px">
          <RadioDot checked={false} />
          <Text size="1" color="gray">
            unchecked
          </Text>
        </Flex>
        <Flex align="center" gap="2">
          <Radio variant="surface" value="off" checked={false} readOnly />
          <Text size="1" color="gray">
            unchecked
          </Text>
        </Flex>
      </Flex>
      <Flex align="center" gap="6">
        <Flex align="center" gap="2" width="120px">
          <RadioDot checked disabled />
          <Text size="1" color="gray">
            disabled
          </Text>
        </Flex>
        <Flex align="center" gap="2">
          <Radio variant="surface" value="disabled" checked disabled readOnly />
          <Text size="1" color="gray">
            disabled
          </Text>
        </Flex>
      </Flex>
    </Flex>
  ),
};
