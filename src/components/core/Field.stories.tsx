import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Checkbox,
  Flex,
  Switch,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { Field } from "./Field";

/**
 * The one field anatomy every form in the app is built from: label, help,
 * control, error. The control is a child, so the same wrapper serves a text
 * input, a select, a checkbox group or a dropzone.
 */
const meta = {
  title: "Components/Forms/Field",
  component: Field,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Anatomy: Story = {
  args: {
    label: "Bucket",
    required: true,
    help: "Name of the S3 bucket that stores the data.",
    children: (props) => (
      <TextField.Root {...props} size="3" placeholder="miskatonic-archive" />
    ),
  },
};

export const WithError: Story = {
  args: {
    label: "Email",
    help: "Your primary email address.",
    errors: ["Enter a valid email address"],
    children: (props) => (
      <TextField.Root {...props} size="3" defaultValue="not an email" />
    ),
  },
};

export const ReadOnly: Story = {
  args: {
    label: "Contact email",
    aside: (
      <Text size="1" color="gray">
        Managed in account settings
      </Text>
    ),
    children: (props) => (
      <TextField.Root
        {...props}
        size="3"
        disabled
        defaultValue="ops@miskatonic.edu"
        style={{ fontFamily: "var(--code-font-family)" }}
      />
    ),
  },
};

/**
 * `counter` is caller-driven: Field wraps the control rather than owning it, so
 * it cannot read the value itself. `DynamicForm` computes this for any field
 * declaring `maxLength`; drive it from state when using Field directly.
 */
export const WithCounter: Story = {
  args: { label: "Description", children: null },
  render: () => {
    const [value, setValue] = useState(
      "Long-term marine mammal monitoring across the Salish Sea and outer coast."
    );

    return (
      <Field
        label="Description"
        help="One or two sentences. Shown under the name on the profile page."
        counter={{ value: value.length, max: 1024 }}
      >
        {(props) => (
          <TextArea
            {...props}
            size="3"
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
      </Field>
    );
  },
};

/**
 * A control small enough to sit on the label row lives in `aside`, and the
 * field has no children at all. Pass `htmlFor` and set that id on the control,
 * or the label points at nothing.
 *
 * This is the read-only toggle on the connection form. Compare AsSwitch below,
 * which is the other shape: a switch that needs a caption beside it, so it goes
 * in the body as a `group` instead.
 */
export const WithInlineSwitch: Story = {
  args: {
    label: "Read only",
    htmlFor: "read-only-switch",
    help: "Products can browse and download but never write. Required for unsigned connections.",
    aside: (
      <Switch
        id="read-only-switch"
        size="2"
        defaultChecked
        // The label row aligns on the text baseline, which a switch does not have.
        style={{ alignSelf: "center" }}
      />
    ),
  },
};

/** One fieldset with a legend, not one "field" per checkbox. */
export const AsCheckboxGroup: Story = {
  args: {
    label: "Allowed visibilities",
    help: "Which visibilities a product on this connection may use.",
    group: true,
    children: (
      <Flex direction="column" gap="2">
        {[
          ["Public", "Listed and downloadable by anyone.", true],
          ["Unlisted", "Downloadable with the link only.", true],
          ["Restricted", "Members of the product only.", false],
        ].map(([label, description, checked]) => (
          <Text as="label" size="2" key={String(label)}>
            <Flex gap="2" align="start">
              <Checkbox defaultChecked={checked as boolean} mt="1" />
              <Flex direction="column">
                <Text size="2">{label}</Text>
                <Text size="1" color="gray">
                  {description}
                </Text>
              </Flex>
            </Flex>
          </Text>
        ))}
      </Flex>
    ),
  },
};
