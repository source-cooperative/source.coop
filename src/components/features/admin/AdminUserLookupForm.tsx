"use client";

import { useState } from "react";
import { AccountSearchInput, DynamicForm, FormField } from "@/components/core";
import { lookupUser } from "@/lib/actions/admin";

type LookupFormData = {
  query: string;
};

export function AdminUserLookupForm() {
  const [selectedQuery, setSelectedQuery] = useState("");
  const [formKey, setFormKey] = useState(0);

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
          defaultValue={selectedQuery}
          onSelect={(accountId) => {
            setSelectedQuery(accountId);
            setFormKey((k) => k + 1);
          }}
        />
      ),
    },
  ];

  return (
    <DynamicForm<LookupFormData>
      key={formKey}
      fields={fields}
      action={lookupUser}
      submitButtonText="Look up user"
    />
  );
}
