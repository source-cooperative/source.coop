import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Checkbox,
  Flex,
  RadioCards,
  Select,
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
  title: "Forms/Field",
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
      <TextField.Root {...props} size="3" placeholder="cascadia-archive" />
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
        defaultValue="ops@cascadia-research.org"
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

export const AsSelect: Story = {
  args: {
    label: "Data connection",
    help: "Where this product's objects live. Permanent once created.",
    children: (props) => (
      <Select.Root size="3" defaultValue="us-west-2">
        <Select.Trigger {...props} style={{ width: "100%" }} />
        <Select.Content>
          <Select.Item value="us-west-2">Source Cooperative — US West</Select.Item>
          <Select.Item value="eu-central-1">Source Cooperative — EU</Select.Item>
        </Select.Content>
      </Select.Root>
    ),
  },
};

/**
 * Radio cards are for a handful of options that each need a sentence — and
 * unlike a disabled `<option>`, a disabled card can say why.
 */
export const AsRadioCards: Story = {
  args: {
    label: "Visibility",
    help: "Who can reach this product. The options depend on its data connection.",
    group: true,
    children: (
      <RadioCards.Root size="1" columns="3" defaultValue="public">
        {[
          {
            value: "public",
            label: "Public",
            description: "Anyone can find and download it.",
          },
          {
            value: "unlisted",
            label: "Unlisted",
            description: "Link only. Hidden from search.",
          },
          {
            value: "restricted",
            label: "Restricted",
            description: "Members of this product only.",
            disabled: true,
          },
        ].map((option) => (
          <RadioCards.Item
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            // Mirrors DynamicForm: Radix centres item content on both axes, so
            // a shorter card would float mid-height and indent from the left.
            style={{ alignItems: "flex-start", justifyContent: "flex-start" }}
          >
            <Flex align="start" gap="2" width="100%">
              {/* Mirrors DynamicForm's RadioDot: Radix ships no indicator, so
                  the card border would otherwise be the only selection cue. */}
              <span
                aria-hidden
                style={{
                  position: "relative",
                  display: "inline-block",
                  flexShrink: 0,
                  width: "var(--space-4)",
                  height: "var(--space-4)",
                  marginTop: "2px",
                  borderRadius: "100%",
                  backgroundColor: option.disabled
                    ? "var(--gray-a3)"
                    : option.value === "public"
                      ? "var(--accent-indicator)"
                      : "var(--color-surface)",
                  boxShadow:
                    option.value === "public" && !option.disabled
                      ? undefined
                      : `inset 0 0 0 1px var(--gray-a${option.disabled ? "6" : "7"})`,
                }}
              >
                {option.value === "public" && (
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      margin: "auto",
                      width: "40%",
                      height: "40%",
                      borderRadius: "100%",
                      backgroundColor: "var(--accent-contrast)",
                    }}
                  />
                )}
              </span>
              <Flex direction="column" align="start" gap="1">
                <Text size="2" weight="medium">
                  {option.label}
                </Text>
                <Text size="1" color="gray">
                  {option.description}
                </Text>
              </Flex>
            </Flex>
          </RadioCards.Item>
        ))}
      </RadioCards.Root>
    ),
  },
};

/** A two-value select is a switch wearing a costume. */
export const AsSwitch: Story = {
  args: {
    label: "Status",
    help: "Deactivating hides the product and blocks the data API. Only an administrator can reactivate it.",
    group: true,
    children: (
      <Flex align="center" gap="2">
        <Switch size="2" defaultChecked />
        <Text size="2">Active</Text>
      </Flex>
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
