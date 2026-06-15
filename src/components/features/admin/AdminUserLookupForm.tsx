"use client";

import { DynamicForm, FormField } from "@/components/core";
import { lookupUserByEmail } from "@/lib/actions/admin";

type LookupFormData = {
  email: string;
};

const fields: FormField<LookupFormData>[] = [
  {
    label: "Email",
    name: "email",
    type: "email",
    required: true,
    placeholder: "user@example.com",
    description:
      "Looks up the email in Ory and, if found, opens that user's profile.",
  },
];

export function AdminUserLookupForm() {
  return (
    <DynamicForm<LookupFormData>
      fields={fields}
      action={lookupUserByEmail}
      submitButtonText="Look up user"
    />
  );
}
