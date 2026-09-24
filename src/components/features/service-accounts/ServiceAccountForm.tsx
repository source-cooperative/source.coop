"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Callout,
  Card,
  Checkbox,
  Code,
  Flex,
  Radio,
  Separator,
  Text,
} from "@radix-ui/themes";
import { InfoCircledIcon, TrashIcon, PlusIcon } from "@radix-ui/react-icons";
import { formFieldStyle as fieldStyle } from "@/components/core/DynamicForm";
import {
  planChanges,
  validate,
  ROLES,
  ROLES_ORDER,
  type Plan,
  type RoleId,
  type ServiceAccountFormValues,
  type SignInMethod,
} from "./plan";
import { ServiceAccountDetail } from "./ServiceAccountDetail";
import { MockDisclosure } from "./MockDisclosure";

/** Mock key, formatted like the real one would be. Never leaves the browser. */
function mockApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
  return `sc_sa_${body}`;
}

interface Props {
  ownerAccountId: string;
  ownerType: "individual" | "organization";
  products: { product_id: string; title: string }[];
  /** Present when editing one of the fabricated accounts. */
  initialValues?: ServiceAccountFormValues;
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Flex direction="column" gap="1">
      <Text size="3" weight="medium">
        {label}
      </Text>
      {description && (
        <Text size="1" color="gray">
          {description}
        </Text>
      )}
      <Box mt="1">{children}</Box>
    </Flex>
  );
}

export function ServiceAccountForm({
  ownerAccountId,
  ownerType,
  products,
  initialValues,
}: Props) {
  const isExisting = Boolean(initialValues);

  const [name, setName] = useState(initialValues?.name ?? "");
  const [signInMethods, setSignInMethods] = useState<SignInMethod[]>(
    initialValues?.signInMethods ?? [
      { kind: "github", repository: "", ref: "refs/heads/main" },
    ]
  );
  const [accessScope, setAccessScope] = useState<"all" | "subset">(
    initialValues?.accessScope ?? "subset"
  );
  const [allPermission, setAllPermission] = useState<"read" | "write">(
    initialValues?.allPermission ?? "read"
  );
  const [productGrants, setProductGrants] = useState<
    Record<string, "read" | "write">
  >(
    Object.fromEntries(
      (initialValues?.productGrants ?? []).map((grant) => [
        grant.product_id,
        grant.permission,
      ])
    )
  );
  const [allowedRoles, setAllowedRoles] = useState<RoleId[]>(
    initialValues?.allowedRoles ?? ["full_access", "read_only"]
  );

  const [plan, setPlan] = useState<Plan | null>(null);
  const [submitted, setSubmitted] = useState<ServiceAccountFormValues | null>(
    null
  );
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const values: ServiceAccountFormValues = {
    name,
    ownerAccountId,
    signInMethods,
    accessScope,
    allPermission,
    productGrants: Object.entries(productGrants).map(
      ([product_id, permission]) => ({ product_id, permission })
    ),
    allowedRoles,
  };

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (found.length) {
      setPlan(null);
      return;
    }
    // A key is only shown once, so it is minted at "create" time, not on
    // every render of the detail view.
    setIssuedKey(
      values.signInMethods.some((m) => m.kind === "api_key")
        ? mockApiKey()
        : null
    );
    setSubmitted(values);
    setPlan(planChanges(values));
    window.scrollTo({ top: 0 });
  }

  function updateMethod(index: number, next: SignInMethod) {
    setSignInMethods((current) =>
      current.map((method, i) => (i === index ? next : method))
    );
  }

  function toggleRole(role: RoleId, checked: boolean) {
    setAllowedRoles((current) =>
      checked
        ? ROLES_ORDER.filter((r) => current.includes(r) || r === role)
        : current.filter((r) => r !== role)
    );
  }

  function toggleProduct(productId: string, checked: boolean) {
    setProductGrants((current) => {
      const next = { ...current };
      if (checked) next[productId] = "read";
      else delete next[productId];
      return next;
    });
  }

  if (plan && submitted) {
    return (
      <ServiceAccountDetail
        plan={plan}
        values={submitted}
        issuedKey={issuedKey}
        onEdit={() => {
          // Rehydration is free: the form state was never cleared.
          setPlan(null);
          setSubmitted(null);
        }}
      />
    );
  }

  return (
    <Flex direction="column" gap="5">
      <MockDisclosure summary="Design mock — nothing is saved. What is this?">
        <Text size="2" as="p">
          This form stands in for the service-account flow proposed in{" "}
          <Code>#491</Code>. Filling it in and submitting shows the database
          rows the real thing would write, so the data model can be reviewed
          before it is built. No account is created and no key is issued.
        </Text>
      </MockDisclosure>

      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="5">
          <Field
            label="Name"
            description="How you'll recognise this service account in the list."
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nightly Sync"
              style={fieldStyle}
            />
            <Text size="1" color="gray" mt="1" as="p">
              {ownerType === "organization"
                ? "Owned by this organization, so it survives any member leaving."
                : "Owned by you personally, so it is disabled if your account is — an organization-owned one would outlive you leaving."}
            </Text>
          </Field>

          <Separator size="4" />

          <Field
            label="How software signs in"
            description="Add as many as you need. Every route reaches the same account with the same access — if you want CI to have different access than a key, make two service accounts."
          >
            <Flex direction="column" gap="3">
              {signInMethods.map((method, index) => (
                <Card key={index}>
                  <Flex direction="column" gap="3">
                    <Flex justify="between" align="center">
                      <Flex gap="4" align="center" asChild>
                        <div>
                          <label>
                            <Flex gap="2" align="center">
                              <Radio
                                name={`method-${index}`}
                                value="github"
                                checked={method.kind === "github"}
                                onClick={() =>
                                  updateMethod(index, {
                                    kind: "github",
                                    repository: "",
                                    ref: "refs/heads/main",
                                  })
                                }
                              />
                              <Text size="2">GitHub repository</Text>
                            </Flex>
                          </label>
                          <label>
                            <Flex gap="2" align="center">
                              <Radio
                                name={`method-${index}`}
                                value="api_key"
                                checked={method.kind === "api_key"}
                                onClick={() =>
                                  updateMethod(index, {
                                    kind: "api_key",
                                    expiresInDays: 90,
                                  })
                                }
                              />
                              <Text size="2">API key</Text>
                            </Flex>
                          </label>
                        </div>
                      </Flex>
                      {signInMethods.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          color="red"
                          onClick={() =>
                            setSignInMethods((current) =>
                              current.filter((_, i) => i !== index)
                            )
                          }
                        >
                          <TrashIcon /> Remove
                        </Button>
                      )}
                    </Flex>

                    {method.kind === "github" ? (
                      <Flex gap="3" wrap="wrap">
                        <Box style={{ flex: "1 1 240px" }}>
                          <Text size="1" color="gray">
                            Repository
                          </Text>
                          <input
                            type="text"
                            value={method.repository}
                            placeholder="myorg/myrepo"
                            onChange={(e) =>
                              updateMethod(index, {
                                ...method,
                                repository: e.target.value,
                              })
                            }
                            style={fieldStyle}
                          />
                        </Box>
                        <Box style={{ flex: "1 1 200px" }}>
                          <Text size="1" color="gray">
                            Git ref
                          </Text>
                          <input
                            type="text"
                            value={method.ref}
                            onChange={(e) =>
                              updateMethod(index, {
                                ...method,
                                ref: e.target.value,
                              })
                            }
                            style={fieldStyle}
                          />
                        </Box>
                        <Text size="1" color="gray">
                          GitHub vouches for the workflow, so there is no secret
                          to store.
                        </Text>
                      </Flex>
                    ) : (
                      <Flex direction="column" gap="2">
                        <Text size="1" color="gray">
                          Expires after
                        </Text>
                        <select
                          value={
                            method.expiresInDays === null
                              ? "never"
                              : method.expiresInDays
                          }
                          onChange={(e) =>
                            updateMethod(index, {
                              kind: "api_key",
                              expiresInDays:
                                e.target.value === "never"
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                          style={{ ...fieldStyle, maxWidth: 220 }}
                        >
                          <option value={30}>30 days</option>
                          <option value={90}>90 days</option>
                          <option value={365}>365 days</option>
                          <option value="never">Never expires</option>
                        </select>
                        <Text size="1" color="gray">
                          The secret is shown once when the account is created
                          and never stored in readable form.
                          {method.expiresInDays === null &&
                            " A key with no expiry can only be withdrawn by revoking it."}
                        </Text>
                      </Flex>
                    )}
                  </Flex>
                </Card>
              ))}

              <Box>
                <Button
                  type="button"
                  variant="soft"
                  onClick={() =>
                    setSignInMethods((current) => [
                      ...current,
                      { kind: "api_key", expiresInDays: 90 },
                    ])
                  }
                >
                  <PlusIcon /> Add another way to sign in
                </Button>
              </Box>
            </Flex>
          </Field>

          <Separator size="4" />

          <Field
            label="What it can reach"
            description="These become ordinary memberships — the same rows, the same revocation, as a person's access."
          >
            <Flex direction="column" gap="3">
              <label>
                <Flex gap="2" align="center">
                  <Radio
                    name="scope"
                    value="all"
                    checked={accessScope === "all"}
                    onClick={() => setAccessScope("all")}
                  />
                  <Text size="2">Every product under {ownerAccountId}</Text>
                </Flex>
              </label>

              {accessScope === "all" && (
                <Box ml="5">
                  <select
                    value={allPermission}
                    onChange={(e) =>
                      setAllPermission(e.target.value as "read" | "write")
                    }
                    style={{ ...fieldStyle, maxWidth: 220 }}
                  >
                    <option value="read">Read</option>
                    <option value="write">Read and write</option>
                  </select>
                </Box>
              )}

              <label>
                <Flex gap="2" align="center">
                  <Radio
                    name="scope"
                    value="subset"
                    checked={accessScope === "subset"}
                    onClick={() => setAccessScope("subset")}
                  />
                  <Text size="2">Specific products</Text>
                </Flex>
              </label>

              {accessScope === "subset" && (
                <Box ml="5">
                  {products.length === 0 ? (
                    <Text size="2" color="gray">
                      This account has no products yet.
                    </Text>
                  ) : (
                    <Flex direction="column" gap="2">
                      {products.map((product) => {
                        const checked = product.product_id in productGrants;
                        return (
                          <Flex
                            key={product.product_id}
                            gap="3"
                            align="center"
                            wrap="wrap"
                          >
                            <label>
                              <Flex gap="2" align="center">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) =>
                                    toggleProduct(
                                      product.product_id,
                                      value === true
                                    )
                                  }
                                />
                                <Text size="2">
                                  <Code>{product.product_id}</Code>{" "}
                                  <Text color="gray">{product.title}</Text>
                                </Text>
                              </Flex>
                            </label>
                            {checked && (
                              <select
                                value={productGrants[product.product_id]}
                                onChange={(e) =>
                                  setProductGrants((current) => ({
                                    ...current,
                                    [product.product_id]: e.target.value as
                                      | "read"
                                      | "write",
                                  }))
                                }
                                style={{
                                  ...fieldStyle,
                                  maxWidth: 180,
                                  width: "auto",
                                }}
                              >
                                <option value="read">Read</option>
                                <option value="write">Read and write</option>
                              </select>
                            )}
                          </Flex>
                        );
                      })}
                    </Flex>
                  )}
                </Box>
              )}
            </Flex>
          </Field>

          <Separator size="4" />

          <Field
            label="Roles it may use"
            description="A role only ever takes access away, never adds it. Software picks one of these when it asks for credentials — so a read-only job can run under Read only even though the account could write. Unticking Full access is how you guarantee this account can never write, even if someone later widens its grants."
          >
            <Flex direction="column" gap="2">
              {ROLES_ORDER.map((role) => (
                <label key={role}>
                  <Flex gap="2" align="start">
                    <Checkbox
                      checked={allowedRoles.includes(role)}
                      onCheckedChange={(value) =>
                        toggleRole(role, value === true)
                      }
                    />
                    <Box>
                      <Text size="2" weight="medium">
                        {ROLES[role].label}
                      </Text>
                      <br />
                      <Text size="1" color="gray">
                        {ROLES[role].description}
                      </Text>
                    </Box>
                  </Flex>
                </label>
              ))}
              {allowedRoles.length === ROLES_ORDER.length && (
                <Text size="1" color="gray">
                  Both ticked, so the restriction is a no-op — it only bites once
                  you untick Full access.
                </Text>
              )}
            </Flex>
          </Field>

          {errors.length > 0 && (
            <Callout.Root color="red">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                <Flex direction="column" gap="1">
                  {errors.map((error) => (
                    <span key={error}>{error}</span>
                  ))}
                </Flex>
              </Callout.Text>
            </Callout.Root>
          )}

          <Box>
            <Button type="submit" size="3">
              {isExisting
                ? "Show what this would change"
                : "Show what this would create"}
            </Button>
          </Box>
        </Flex>
      </form>

    </Flex>
  );
}
