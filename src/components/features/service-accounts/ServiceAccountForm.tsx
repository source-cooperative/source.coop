"use client";

import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Checkbox,
  Code,
  Flex,
  Heading,
  Radio,
  Separator,
  Table,
  Text,
} from "@radix-ui/themes";
import { InfoCircledIcon, TrashIcon, PlusIcon } from "@radix-ui/react-icons";
import { formFieldStyle as fieldStyle } from "@/components/core/DynamicForm";
import {
  planChanges,
  validate,
  ROLES,
  ROLES_ORDER,
  SERVICE_ID_PREFIX,
  type Plan,
  type RoleId,
  type ServiceAccountFormValues,
  type SignInMethod,
} from "./plan";

interface Props {
  ownerAccountId: string;
  ownerType: "individual" | "organization";
  products: { product_id: string; title: string }[];
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
}: Props) {
  const [name, setName] = useState("");
  const [signInMethods, setSignInMethods] = useState<SignInMethod[]>([
    { kind: "github", repository: "", ref: "refs/heads/main" },
  ]);
  const [accessScope, setAccessScope] = useState<"all" | "subset">("subset");
  const [allPermission, setAllPermission] = useState<"read" | "write">("read");
  const [productGrants, setProductGrants] = useState<
    Record<string, "read" | "write">
  >({});
  const [allowedRoles, setAllowedRoles] = useState<RoleId[]>([
    "full_access",
    "read_only",
  ]);

  const [plan, setPlan] = useState<Plan | null>(null);
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
    setPlan(found.length ? null : planChanges(values));
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

  return (
    <Flex direction="column" gap="5">
      <Callout.Root color="amber">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <strong>Design mock.</strong> Nothing here is saved. Submitting shows
          the database rows this would write, so we can review the data model in{" "}
          <Code>#491</Code> before building it.
        </Callout.Text>
      </Callout.Root>

      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="5">
          <Field
            label="Name"
            description={
              <>
                Stored as{" "}
                <Code>
                  {SERVICE_ID_PREFIX}
                  {name || "<name>"}
                </Code>
                . Service accounts use a reserved prefix so they can never
                collide with a person&rsquo;s account name.
              </>
            }
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="nightly-sync"
              style={fieldStyle}
            />
          </Field>

          <Field
            label="Owner"
            description={
              ownerType === "organization"
                ? "Owned by the organization, so it survives any member leaving."
                : "Owned by you personally, so it is disabled if your account is. An organization-owned account would outlive you leaving."
            }
          >
            <Code>{ownerAccountId}</Code>
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
                          value={method.expiresInDays}
                          onChange={(e) =>
                            updateMethod(index, {
                              kind: "api_key",
                              expiresInDays: Number(e.target.value),
                            })
                          }
                          style={{ ...fieldStyle, maxWidth: 220 }}
                        >
                          <option value={30}>30 days</option>
                          <option value={90}>90 days</option>
                          <option value={365}>365 days</option>
                        </select>
                        <Text size="1" color="gray">
                          Keys always expire. The secret is shown once when the
                          account is created and never stored in readable form.
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
              Show what this would create
            </Button>
          </Box>
        </Flex>
      </form>

      {plan && <PlanPreview plan={plan} />}
    </Flex>
  );
}

function PlanPreview({ plan }: { plan: Plan }) {
  return (
    <Box mt="4">
      <Separator size="4" mb="4" />
      <Heading size="5" mb="1">
        What this would create
      </Heading>
      <Text size="2" color="gray">
        Creating <Code>{plan.serviceAccountId}</Code> would write these rows.
      </Text>

      <Flex direction="column" gap="4" mt="4">
        {plan.tables.map((table) => (
          <Card key={table.table}>
            <Flex align="center" gap="2" mb="1">
              <Heading size="3">
                <Code>{table.table}</Code>
              </Heading>
              <Badge color={table.status === "new table" ? "orange" : "gray"}>
                {table.status}
              </Badge>
              <Text size="1" color="gray">
                {table.purpose}
              </Text>
            </Flex>

            {table.rows.length === 0 ? (
              <Text size="2" color="gray">
                No rows.
              </Text>
            ) : (
              <Flex direction="column" gap="3" mt="2">
                {table.rows.map((row, index) => (
                  <Box key={index}>
                    <Table.Root size="1" variant="surface">
                      <Table.Body>
                        {Object.entries(row.fields).map(([key, value]) => (
                          <Table.Row key={key}>
                            <Table.RowHeaderCell
                              style={{ width: "40%", whiteSpace: "nowrap" }}
                            >
                              <Text size="1" color="gray">
                                {key}
                              </Text>
                            </Table.RowHeaderCell>
                            <Table.Cell>
                              <Code size="1">{value}</Code>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                    {row.note && (
                      <Text size="1" color="gray" as="p" mt="1">
                        {row.note}
                      </Text>
                    )}
                  </Box>
                ))}
              </Flex>
            )}
          </Card>
        ))}

        <Card>
          <Heading size="3" mb="2">
            How the software would be configured
          </Heading>
          <Flex direction="column" gap="3">
            {plan.workloadConfig.map((block) => (
              <Box key={block.title}>
                <Text size="2" weight="medium">
                  {block.title}
                </Text>
                <Box
                  mt="1"
                  p="3"
                  style={{
                    background: "var(--gray-3)",
                    border: "1px solid var(--gray-6)",
                    overflowX: "auto",
                  }}
                >
                  <pre style={{ margin: 0 }}>
                    <Code size="1">{block.lines.join("\n")}</Code>
                  </pre>
                </Box>
              </Box>
            ))}
          </Flex>
        </Card>

        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Flex direction="column" gap="1">
              {plan.caveats.map((caveat) => (
                <span key={caveat}>{caveat}</span>
              ))}
            </Flex>
          </Callout.Text>
        </Callout.Root>
      </Flex>
    </Box>
  );
}
