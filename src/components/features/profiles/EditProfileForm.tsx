"use client";

import { useState } from "react";
import { Account } from "@/types";
import { Button, Flex, Text, Box, TextField, Tooltip } from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { DynamicForm, FormField } from "@/components/core";
import { updateAccountProfile } from "@/lib/actions/account";

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
  };

  const fields: FormField<EditProfileFormData>[] = [
    {
      label: "Name (Required)",
      name: "name",
      type: "text",
      required: true,
      placeholder: "Your Name",
      description: "This is the name that will be displayed on your profile",
    },
    {
      label: "Email (Required)",
      name: "email",
      type: "email",
      required: true,
      placeholder: "you@example.com",
      description:
        initialAccount.type === "individual"
          ? "Your primary email address"
          : "Contact email for your organization",
    },
    {
      label: initialAccount.type === "individual" ? "Bio" : "Description",
      name: "description",
      type: "textarea",
      ...(initialAccount.type === "individual"
        ? {
            placeholder: "Tell us about yourself",
            description:
              "A brief description of yourself or your work (220 characters maximum)",
          }
        : {
            placeholder: "Tell us about your organization",
            description:
              "A brief description of your organization (220 characters maximum)",
          }),
    },
    ...(initialAccount.type === "individual"
      ? [
          {
            label: "ORCID ID",
            name: "orcid",
            type: "text" as const,
            placeholder: "0000-0002-1825-0097",
            description: "Your ORCID identifier (optional)",
          } as const,
        ]
      : []),
    {
      label: "Websites",
      name: "websites",
      type: "custom",
      description: "Add websites associated with your profile",
      customComponent: (
        <Box>
          <Flex direction="column" gap="3">
            {websites.map((website, index) => (
              <Box key={`website-${index}`}>
                <WebsiteInputField
                  value={website.url}
                  onChange={(value) => handleWebsiteChange(index, value)}
                  onRemove={() => removeWebsite(index)}
                  showRemoveButton={websites.length > 1}
                />
                <Text size="1" color="gray" mt="1">
                  Website URL
                </Text>
              </Box>
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
      submitButtonText="Save Changes"
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
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Flex align="center" gap="2">
      <Box style={{ flexGrow: 1 }}>
        <TextField.Root
          value={value}
          placeholder="example.com"
          onChange={(e) => onChange(e.target.value)}
          size="3"
          variant="surface"
          style={{ width: "100%" }}
        />
      </Box>
      {showRemoveButton && onRemove && (
        <Tooltip content="Remove website">
          <Box
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "6px",
            }}
            onClick={onRemove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <TrashIcon
              color={isHovering ? "tomato" : "gray"}
              width="18"
              height="18"
            />
          </Box>
        </Tooltip>
      )}
    </Flex>
  );
}
