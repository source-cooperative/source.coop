"use client";

import { useState } from "react";
import { Account } from "@/types";
import {
  Button,
  Flex,
  Box,
  IconButton,
  TextField,
  Tooltip,
  Link,
} from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { DynamicForm, FormField } from "@/components/core";
import { updateAccountProfile } from "@/lib/actions/account";
import { orySettingsUrl } from "@/lib/urls";
import { BIO_MAX_LENGTH } from "@/types/account";

interface Website {
  url: string;
}

interface EditProfileFormProps {
  account: Account;
}

interface EditProfileFormData {
  name: string;
  email: string;
  description: string;
  orcid?: string;
  ror_id?: string;
  websites?: string;
  bio?: string;
}

export function EditProfileForm({
  account: initialAccount,
}: EditProfileFormProps) {
  // Initialize websites from account data
  const [websites, setWebsites] = useState<Website[]>(() => {
    const accountWebsites = initialAccount.metadata_public?.domains || [];
    return accountWebsites.length > 0
      ? accountWebsites.map((domain) => ({ url: domain.domain }))
      : [{ url: "" }]; // Start with one empty website field if no existing websites
  });

  // Controlled so the character counter tracks what is actually in the field.
  const [description, setDescription] = useState(
    initialAccount.metadata_public?.bio || ""
  );

  const handleWebsiteChange = (index: number, url: string) => {
    setWebsites((prev) =>
      prev.map((website, i) => (i === index ? { url } : website))
    );
  };

  const addWebsite = () => {
    setWebsites((prev) => [...prev, { url: "" }]);
  };

  const removeWebsite = (index: number) => {
    setWebsites((prev) => prev.filter((_, i) => i !== index));
  };

  // Create initial values for the form
  const initialValues: EditProfileFormData = {
    name: initialAccount.name || "",
    email:
      initialAccount.emails?.find((email) => email.is_primary)?.address || "",
    description: initialAccount.metadata_public?.bio || "",
    orcid:
      (initialAccount.type === "individual" &&
        initialAccount.metadata_public?.orcid) ||
      "",
    ror_id:
      (initialAccount.type === "organization" &&
        initialAccount.metadata_public?.ror_id) ||
      "",
  };

  const fields: FormField<EditProfileFormData>[] = [
    {
      label: "Name",
      name: "name",
      type: "text",
      required: true,
      section: "Identity",
      placeholder: "Your Name",
      description: "This is the name that will be displayed on your profile",
    },
    {
      label: "Email",
      name: "email",
      type: "email",
      readOnly: true,
      section: "Identity",
      mono: true,
      placeholder: "you@example.com",
      description:
        initialAccount.type === "individual" ? (
          <>
            Your primary email address. You can change it in your{" "}
            <Link href={orySettingsUrl()} target="_blank" rel="noopener noreferrer">account settings</Link>.
          </>
        ) : (
          "Contact email for your organization"
        ),
    },
    {
      label: initialAccount.type === "individual" ? "Bio" : "Description",
      name: "description",
      type: "textarea",
      section: "About",
      // BIO_MAX_LENGTH comes from the schema that validates this, so the
      // counter and the validator cannot drift apart the way the old
      // "220 characters maximum" help text had.
      maxLength: BIO_MAX_LENGTH,
      controlled: true,
      value: description,
      onValueChange: setDescription,
      ...(initialAccount.type === "individual"
        ? {
            placeholder: "Tell us about yourself",
            description: "A brief description of yourself or your work",
          }
        : {
            placeholder: "Tell us about your organization",
            description: "A brief description of your organization",
          }),
    },
    ...(initialAccount.type === "individual"
      ? [
          {
            label: "ORCID ID",
            name: "orcid",
            type: "text" as const,
            section: "Identifiers",
            mono: true,
            placeholder: "0000-0002-1825-0097",
            description: "Your ORCID identifier (optional)",
          } as const,
        ]
      : []),
    ...(initialAccount.type === "organization"
      ? [
          {
            label: "ROR ID",
            name: "ror_id",
            type: "text" as const,
            section: "Identifiers",
            mono: true,
            placeholder: "03yrm5c26",
            description: "Your Research Organization Registry identifier (optional)",
          } as const,
        ]
      : []),
    {
      label: "Websites",
      name: "websites",
      type: "custom",
      section: "Links",
      description: "Add websites associated with your profile",
      customComponent: (
        <Box>
          <Flex direction="column" gap="3">
            {websites.map((website, index) => (
              <WebsiteInputField
                key={`website-${index}`}
                value={website.url}
                onChange={(value) => handleWebsiteChange(index, value)}
                onRemove={() => removeWebsite(index)}
                showRemoveButton={websites.length > 1}
              />
            ))}
          </Flex>
          <Box mt="3">
            <Button type="button" variant="soft" onClick={addWebsite} size="2">
              Add another website
            </Button>
          </Box>
        </Box>
      ),
    },
  ];

  return (
    <DynamicForm<EditProfileFormData>
      fields={fields}
      action={updateAccountProfile}
      initialValues={initialValues}
      hiddenFields={{
        account_id: initialAccount.account_id,
        // Add websites as hidden fields
        ...websites.reduce((acc, website, index) => {
          acc[`websites_${index}`] = website.url;
          return acc;
        }, {} as Record<string, string>),
      }}
    />
  );
}

// Custom component for website input with inline remove button
function WebsiteInputField({
  value,
  onChange,
  onRemove,
  showRemoveButton,
}: {
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  showRemoveButton: boolean;
}) {
  return (
    <Flex align="center" gap="2">
      <Box style={{ flexGrow: 1 }}>
        <TextField.Root
          value={value}
          placeholder="example.com"
          onChange={(e) => onChange(e.target.value)}
          size="3"
          variant="surface"
          style={{
            width: "100%",
            fontFamily: "var(--code-font-family)",
          }}
        />
      </Box>
      {showRemoveButton && onRemove && (
        <Tooltip content="Remove website">
          <IconButton
            type="button"
            size="3"
            variant="ghost"
            color="gray"
            aria-label="Remove website"
            onClick={onRemove}
          >
            <TrashIcon width="18" height="18" />
          </IconButton>
        </Tooltip>
      )}
    </Flex>
  );
}
