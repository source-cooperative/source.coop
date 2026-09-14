"use client";

import { AccountSearchInput, DynamicForm, FormField } from "@/components/core";
import { lookupUser } from "@/lib/actions/admin";

type LookupFormData = {
  query: string;
};

const fields: FormField<LookupFormData>[] = [
  {
    label: "User",
    name: "query",
    type: "custom",
    required: true,
    description:
      "Search by username or name, or enter an email address to look it up in Ory. Opens that user's profile.",
    customComponent: (controlProps) => (
      <AccountSearchInput
        {...controlProps}
        name="query"
        required
        placeholder="username, name, or user@example.com"
      />
    ),
  },
];

export function AdminUserLookupForm() {
  return (
    <DynamicForm<LookupFormData>
      fields={fields}
      action={lookupUser}
      submitButtonText="Look up user"
    />
  );
}
