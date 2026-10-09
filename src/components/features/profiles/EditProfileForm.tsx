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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("EditProfileForm");
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
      label: t("name"),
      name: "name",
      type: "text",
      required: true,
      section: t("sectionIdentity"),
      placeholder: t("namePlaceholder"),
      description: t("nameDescription"),
    },
    {
      label: t("email"),
      name: "email",
      type: "email",
      readOnly: initialAccount.type === "individual",
      section: t("sectionIdentity"),
      mono: true,
      placeholder: "you@example.com",
      description:
        initialAccount.type === "individual" ? (
          t.rich("emailDescriptionIndividual", {
            link: (chunks) => (
              <Link href={orySettingsUrl()} target="_blank" rel="noopener noreferrer">{chunks}</Link>
            ),
          })
        ) : (
          t("emailDescriptionOrganization")
        ),
    },
    {
      label: initialAccount.type === "individual" ? t("bio") : t("description"),
      name: "description",
      type: "textarea",
      section: t("sectionAbout"),
      // BIO_MAX_LENGTH comes from the schema that validates this, so the
      // counter and the validator cannot drift apart the way the old
      // "220 characters maximum" help text had.
      maxLength: BIO_MAX_LENGTH,
      controlled: true,
      value: description,
      onValueChange: setDescription,
      ...(initialAccount.type === "individual"
        ? {
            placeholder: t("bioPlaceholder"),
            description: t("bioDescription"),
          }
        : {
            placeholder: t("descriptionPlaceholder"),
            description: t("descriptionDescription"),
          }),
    },
    ...(initialAccount.type === "individual"
      ? [
          {
            label: t("orcid"),
            name: "orcid",
            type: "text" as const,
            section: t("sectionIdentifiers"),
            mono: true,
            placeholder: "0000-0002-1825-0097",
            description: t("orcidDescription"),
          } as const,
        ]
      : []),
    ...(initialAccount.type === "organization"
      ? [
          {
            label: t("rorId"),
            name: "ror_id",
            type: "text" as const,
            section: t("sectionIdentifiers"),
            mono: true,
            placeholder: "03yrm5c26",
            description: t("rorIdDescription"),
          } as const,
        ]
      : []),
    {
      label: t("websites"),
      name: "websites",
      type: "custom",
      section: t("sectionLinks"),
      description: t("websitesDescription"),
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
              {t("addWebsite")}
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
  const t = useTranslations("EditProfileForm");
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
        <Tooltip content={t("removeWebsite")}>
          <IconButton
            type="button"
            size="3"
            variant="ghost"
            color="gray"
            aria-label={t("removeWebsite")}
            onClick={onRemove}
          >
            <TrashIcon width="18" height="18" />
          </IconButton>
        </Tooltip>
      )}
    </Flex>
  );
}
