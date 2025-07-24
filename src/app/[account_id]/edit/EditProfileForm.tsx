"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Account, IndividualAccount } from "@/types";
import {
  Button,
  Flex,
  Text,
  Box,
  Container,
  TextField,
  Tooltip,
} from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { FormWrapper } from "@/components/core/Form";
import type { FormField, FormFieldType } from "@/types/form";
import { useSession } from "@ory/elements-react/client";

// Define types for website and form data
interface Website {
  url: string;
}

interface AccountFormData {
  name: string;
  email: string;
  description?: string;
  orcid?: string;
  websites: Website[];
  [key: string]: string | string[] | Website[] | undefined;
}

interface EditProfileFormProps {
  account: Account;
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
          type="url"
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
              width="24"
              height="24"
            />
          </Box>
        </Tooltip>
      )}
    </Flex>
  );
}

export function EditProfileForm({
  account: initialAccount,
}: EditProfileFormProps) {
  const router = useRouter();
  const { refetch } = useSession();
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    name: initialAccount.name,
    email:
      initialAccount.emails?.find((email) => email.is_primary)?.address || "",
    description: initialAccount.metadata_public.bio,
    orcid:
      initialAccount.type === "individual"
        ? (initialAccount as IndividualAccount).metadata_public.orcid
        : undefined,
    websites: initialAccount.metadata_public.domains?.map((domain) => ({
      url: domain.domain,
    })) || [{ url: "" }],
  });

  const handleSubmit = async (_data: Record<string, unknown>) => {
    const data = _data as unknown as AccountFormData; // TODO: Find more elegant way to do this
    setSaving(true);
    try {
      // Process websites: add https:// prefix if needed and filter out empty ones
      const validWebsites = formData.websites
        .map((website) => {
          if (!website.url || website.url.trim() === "") return null;

          let processedUrl = website.url;
          if (
            !processedUrl.startsWith("http://") &&
            !processedUrl.startsWith("https://")
          ) {
            processedUrl = `https://${processedUrl}`;
          }

          return { url: processedUrl };
        })
        .filter(Boolean) as Website[];

      const updateData = {
        ...initialAccount,
        name: data.name,
        emails: [
          {
            address: data.email,
            is_primary: true,
          },
        ],
        metadata_public: {
          ...initialAccount.metadata_public,
          bio: data.description,
          orcid: data.orcid,
          domains: validWebsites.map((website) => ({
            domain: new URL(website.url).hostname,
            status: "unverified",
            created_at: new Date().toISOString(),
          })),
        },
        updated_at: new Date().toISOString(),
      };

      const response = await fetch(
        `/api/accounts/${initialAccount.account_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      await refetch();
      router.push(`/${initialAccount.account_id}`);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw new Error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleWebsiteChange = (index: number, url: string) => {
    setFormData((prev) => ({
      ...prev,
      websites: prev.websites.map((website, i) =>
        i === index ? { url } : website
      ),
    }));
  };

  const addWebsite = () => {
    setFormData((prev) => ({
      ...prev,
      websites: [...prev.websites, { url: "" }],
    }));
  };

  const removeWebsite = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      websites: prev.websites.filter((_, i) => i !== index),
    }));
  };

  const fields: FormField[] = [
    {
      name: "name",
      label: "Name (Required)",
      type: "text" as FormFieldType,
      required: true,
      placeholder: "Your Name",
      defaultValue: formData.name,
      validation: { minLength: 2 },
      description: "This is the name that will be displayed on your profile",
      onChange: (value) => setFormData((prev) => ({ ...prev, name: value })),
    },
    {
      name: "email",
      label: "Email (Required)",
      type: "email" as FormFieldType,
      required: true,
      placeholder: "you@example.com",
      defaultValue: formData.email,
      validation: {
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      },
      description:
        initialAccount.type === "individual"
          ? "Your primary email address"
          : "Contact email for your organization",
      onChange: (value) => setFormData((prev) => ({ ...prev, email: value })),
    },
    {
      name: "description",
      label: initialAccount.type === "individual" ? "Bio" : "Description",
      type: "textarea" as FormFieldType,
      placeholder:
        initialAccount.type === "individual"
          ? "Tell us about yourself"
          : "Tell us about your organization",
      defaultValue: formData.description,
      description:
        initialAccount.type === "individual"
          ? "A brief description of yourself or your work (220 characters maximum)"
          : "A brief description of your organization (220 characters maximum)",
      validation: { maxLength: 220 },
      style: { height: "7.4rem" },
      onChange: (value) =>
        setFormData((prev) => ({ ...prev, description: value })),
    },
    ...(initialAccount.type === "individual"
      ? [
          {
            name: "orcid",
            label: "ORCID ID",
            type: "text" as FormFieldType,
            placeholder: "0000-0002-1825-0097",
            defaultValue: formData.orcid,
            onChange: (value: string) =>
              setFormData((prev) => ({ ...prev, orcid: value })),
          },
        ]
      : []),
  ];

  return (
    <Container size="2">
      <Box className="mx-auto max-w-md">
        <Box mb="5">
          <Text size="6" weight="bold">
            Edit Profile
          </Text>
        </Box>

        <FormWrapper
          ref={formRef}
          fields={fields}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          isLoading={saving}
          hideSubmit
        />

        <Box mt="5" mb="4">
          <Text size="3" weight="medium" mb="2">
            Websites
          </Text>
          <Flex direction="column" gap="3">
            {formData.websites.map((website, index) => (
              <Box key={`website-${index}`}>
                <WebsiteInputField
                  value={website.url}
                  onChange={(value) => handleWebsiteChange(index, value)}
                  onRemove={() => removeWebsite(index)}
                  showRemoveButton={formData.websites.length > 1}
                />
                <Text size="1" color="gray" mt="1">
                  Website URL
                </Text>
              </Box>
            ))}
          </Flex>
        </Box>

        <Box mb="4">
          <Button type="button" variant="soft" onClick={addWebsite} size="2">
            Add another website
          </Button>
        </Box>

        <Flex justify="end" gap="2" mt="4">
          <Button
            type="button"
            variant="soft"
            onClick={() => router.push(`/${initialAccount.account_id}`)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Flex>
      </Box>
    </Container>
  );
}
