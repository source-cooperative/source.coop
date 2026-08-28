import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flex, Select, TextField } from "@radix-ui/themes";
import { ConditionalGroup } from "./ConditionalGroup";
import { Field } from "./Field";

/**
 * Fields that exist because of a choice made above them.
 *
 * A provider or an authentication method swaps out what follows it. Without the
 * rule and the "Because …" line, those fields read as part of the same flat
 * list, and nothing suggests that choosing differently would replace them —
 * which is what the connection form looked like before.
 */
const meta = {
  title: "Forms/ConditionalGroup",
  component: ConditionalGroup,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ConditionalGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    because: "provider is AWS S3",
    children: (
      <>
        <Field label="Bucket" required>
          {(props) => (
            <TextField.Root {...props} size="3" defaultValue="miskatonic-archive" />
          )}
        </Field>
        <Field label="Region">
          {(props) => (
            <Select.Root defaultValue="us-west-2" size="3">
              <Select.Trigger {...props} style={{ width: "100%" }} />
              <Select.Content>
                <Select.Item value="us-west-2">us-west-2</Select.Item>
                <Select.Item value="eu-central-1">eu-central-1</Select.Item>
              </Select.Content>
            </Select.Root>
          )}
        </Field>
      </>
    ),
  },
};

/**
 * In context: the control that produced the group sits above it, unindented.
 * The rule is what ties the two together.
 */
export const UnderItsControl: Story = {
  args: { because: "method is Access Key", children: null },
  render: () => (
    <Flex direction="column" gap="4">
      <Field label="Method" help="How the data proxy authenticates to this backend.">
        {(props) => (
          <Select.Root defaultValue="s3-access-key" size="3">
            <Select.Trigger {...props} style={{ width: "100%" }} />
            <Select.Content>
              <Select.Item value="s3-access-key">S3 access key</Select.Item>
              <Select.Item value="none">None (unsigned)</Select.Item>
            </Select.Content>
          </Select.Root>
        )}
      </Field>
      <ConditionalGroup because="method is Access Key">
        <Field label="Access key ID" required>
          {(props) => (
            <TextField.Root
              {...props}
              size="3"
              defaultValue="AKIA3XV7QZEXAMPLE"
            />
          )}
        </Field>
      </ConditionalGroup>
    </Flex>
  ),
};

/** A single field still earns the rule: the point is stating the cause. */
export const OneField: Story = {
  args: {
    because: "provider is Google Cloud",
    children: (
      <Field label="Bucket" required>
        {(props) => (
          <TextField.Root {...props} size="3" defaultValue="black-mesa-files" />
        )}
      </Field>
    ),
  },
};
