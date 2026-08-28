import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DynamicForm, type FormField, type FormState } from "./DynamicForm";

type Demo = Record<string, string>;

const noop = (): FormState<Demo> => ({
  fieldErrors: {},
  data: new FormData(),
  message: "",
  success: false,
});

const withErrors =
  (fieldErrors: Record<string, string[]>, message: string) =>
  (): FormState<Demo> => ({
    fieldErrors,
    data: new FormData(),
    message,
    success: false,
  });

const meta = {
  title: "Components/Forms/DynamicForm",
  component: DynamicForm<Demo>,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DynamicForm<Demo>>;

export default meta;
type Story = StoryObj<typeof meta>;

const profileFields: FormField<Demo>[] = [
  {
    label: "Name",
    name: "name",
    type: "text",
    required: true,
    section: "Identity",
    description: "This is the name that will be displayed on your profile",
  },
  {
    label: "Email",
    name: "email",
    type: "email",
    readOnly: true,
    mono: true,
    section: "Identity",
    description: "Your primary email address.",
  },
  {
    label: "Description",
    name: "description",
    type: "textarea",
    section: "About",
    maxLength: 1024,
    description: "A brief description of your organization",
  },
  {
    label: "ROR ID",
    name: "ror_id",
    type: "text",
    mono: true,
    section: "Identifiers",
    placeholder: "03yrm5c26",
    description: "Your Research Organization Registry identifier (optional)",
  },
];

/** Consecutive fields sharing a `section` render under one heading. */
export const Sections: Story = {
  args: {
    fields: profileFields,
    action: noop,
    submitButtonText: "Save changes",
    initialValues: {
      name: "Cascadia Research",
      email: "ops@cascadia-research.org",
      description:
        "Long-term marine mammal monitoring across the Salish Sea and outer coast.",
    },
  },
};

export const ServerErrors: Story = {
  args: {
    fields: profileFields,
    action: withErrors(
      { name: ["Name is required"], ror_id: ["Not a valid ROR identifier"] },
      "Could not save your profile"
    ),
    submitButtonText: "Save changes",
  },
};

/**
 * Radio cards carry the reason an option is unavailable. Both of these types are
 * value-driven, so the type requires them to be controlled — hence the state
 * here rather than plain args.
 */
export const RadioCardsAndSwitch: Story = {
  // `render` supplies everything; args exist only to satisfy the required shape.
  args: { fields: [], action: noop },
  render: () => {
    const [visibility, setVisibility] = useState("public");
    const [disabled, setDisabled] = useState("false");

    return (
      <DynamicForm<Demo>
        submitButtonText="Update product"
        action={noop}
        fields={[
          {
            label: "Visibility",
            name: "visibility",
            type: "radio-cards",
            required: true,
            section: "Access",
            description: "Who can reach this product.",
            controlled: true,
            value: visibility,
            onValueChange: setVisibility,
            options: [
              {
                value: "public",
                label: "Public",
                description:
                  "Anyone can find and download it. Appears in search and the product feed.",
              },
              {
                value: "unlisted",
                label: "Unlisted",
                description:
                  "Anyone with the link can download it. Hidden from search and the feed.",
              },
              {
                value: "restricted",
                label: "Restricted",
                description: "Members of this product only.",
                disabled: true,
              },
            ],
          },
          {
            label: "Status",
            name: "disabled",
            type: "switch",
            section: "Status",
            switchLabel: disabled === "true" ? "Deactivated" : "Active",
            invert: true,
            description:
              "Deactivating hides the product and blocks the data API. Only an administrator can reactivate it.",
            controlled: true,
            value: disabled,
            onValueChange: setDisabled,
          },
        ]}
      />
    );
  },
};

/** A dialog's Cancel belongs in the form's own action row, not under it. */
export const WithSecondaryAction: Story = {
  args: {
    submitButtonText: "Send invitation",
    action: noop,
    secondaryAction: undefined,
    fields: [
      {
        label: "Account ID",
        name: "account_id",
        type: "text",
        required: true,
        mono: true,
        placeholder: "jane-doe",
      },
      {
        label: "Role",
        name: "role",
        type: "select",
        required: true,
        placeholder: "Select a role",
        options: [
          { value: "read", label: "Reader" },
          { value: "write", label: "Writer" },
          { value: "maintain", label: "Maintainer" },
        ],
      },
    ],
  },
};
