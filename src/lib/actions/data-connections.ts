"use server";

import { z } from "zod";
import { LOGGER } from "@/lib/logging";
import {
  Actions,
  DataConnectionSchema,
  DataConnection,
  DataProvider,
  DataConnectionAuthenticationType,
  ProductVisibility,
  UserSession,
  MIN_ID_LENGTH,
  MAX_ID_LENGTH,
  ID_REGEX,
} from "@/types";
import { isAuthorized, canManageAccountDataConnections } from "../api/authz";
import { getPageSession } from "../api/utils";
import {
  accountsTable,
  dataConnectionsTable,
  productsTable,
} from "../clients";
import { FormState } from "@/components/core/DynamicForm";
import { revalidatePath } from "next/cache";
import {
  adminDataConnectionsUrl,
  adminDataConnectionEditUrl,
  accountDataConnectionsUrl,
  accountDataConnectionEditUrl,
} from "@/lib/urls";

/**
 * Authorizes managing a connection. An *owned* connection is governed by its
 * owner account's capability flag + the caller's role there (admin-of-owner);
 * an unowned connection stays admin-only — the caller passes that admin check
 * (`isAuthorized(... CreateDataConnection|PutDataConnection|...)`) as
 * `adminAuthorized`. Keeps the owner/flag rule in one place across CRUD.
 */
async function canManageConnection(
  session: UserSession,
  connection: DataConnection,
  adminAuthorized: boolean
): Promise<boolean> {
  if (!connection.owner) {
    return adminAuthorized;
  }
  // adminAuthorized is true only for platform admins (the data-connection
  // isAuthorized helpers are admin-only), who can manage any connection — even
  // an orphaned one whose owner account has since been deleted.
  if (adminAuthorized) {
    return true;
  }
  const ownerAccount = await accountsTable.fetchById(connection.owner);
  if (!ownerAccount) {
    return false;
  }
  return canManageAccountDataConnections(session, ownerAccount);
}

export async function createDataConnection(
  _prevState: FormState<DataConnection>,
  formData: FormData
): Promise<FormState<DataConnection>> {
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthenticated",
      success: false,
    };
  }

  // Account-scoped create: the page posts the owning account as `owner`. The
  // submitted ID is just a slug; namespace it as `${owner}-${slug}` so two
  // accounts can't collide and an account can't probe another's connection IDs.
  // Lowercase to match the schema's `.toLowerCase()` on `data_connection_id`;
  // otherwise an admin-supplied `owner` of "ACME" stores a connection that the
  // "acme" account's list (filtered on `conn.owner === account_id`) never sees.
  const owner =
    ((formData.get("owner") as string) || "").trim().toLowerCase() || undefined;
  if (owner) {
    const slug = ((formData.get("data_connection_id") as string) || "")
      .trim()
      .toLowerCase();
    if (
      slug.length < MIN_ID_LENGTH ||
      slug.length > MAX_ID_LENGTH ||
      !ID_REGEX.test(slug)
    ) {
      return {
        fieldErrors: {
          data_connection_id: [
            `ID must be ${MIN_ID_LENGTH}–${MAX_ID_LENGTH} lowercase letters, numbers, or hyphens.`,
          ],
        },
        data: formData,
        message: "Invalid connection ID",
        success: false,
      };
    }
    // `--` delimiter: ID_REGEX forbids consecutive hyphens inside an account_id
    // or slug, so the only `--` is this separator — `${owner}--${slug}` is
    // therefore unambiguous and collision-free across accounts (a single `-`
    // would not be, since both halves may themselves contain hyphens).
    formData.set("data_connection_id", `${owner}--${slug}`);
  } else {
    // Unowned (admin) ids may not contain `--`: that sequence is reserved for
    // the namespacing delimiter, so an admin id like `acme--x` would shadow
    // account `acme`'s slug `x` (DATA_CONNECTION_ID_REGEX permits `--` only so
    // the composed namespaced id above validates).
    const rawId = ((formData.get("data_connection_id") as string) || "").trim();
    if (rawId.includes("--")) {
      return {
        fieldErrors: {
          data_connection_id: ["ID may not contain consecutive hyphens (--)."],
        },
        data: formData,
        message: "Invalid connection ID",
        success: false,
      };
    }
  }

  try {
    const dataConnection = buildDataConnectionFromForm(formData);

    const validated = DataConnectionSchema.safeParse(dataConnection);
    if (!validated.success) {
      return {
        fieldErrors: fieldErrorsFromZod(validated.error),
        data: formData,
        message: "Invalid form data",
        success: false,
      };
    }

    if (
      !(await canManageConnection(
        session,
        validated.data,
        isAuthorized(session, validated.data, Actions.CreateDataConnection)
      ))
    ) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Unauthorized to create data connections",
        success: false,
      };
    }

    const existing = await dataConnectionsTable.fetchById(
      validated.data.data_connection_id
    );
    if (existing) {
      return {
        fieldErrors: {
          data_connection_id: [
            "A data connection with this ID already exists",
          ],
        },
        data: formData,
        message: "Data connection ID already exists",
        success: false,
      };
    }

    try {
      // create() does a conditional put; this also rejects a concurrent
      // create that slipped past the existence check above.
      await dataConnectionsTable.create(validated.data);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        return {
          fieldErrors: {
            data_connection_id: [
              "A data connection with this ID already exists",
            ],
          },
          data: formData,
          message: "Data connection ID already exists",
          success: false,
        };
      }
      throw error;
    }

    LOGGER.info("Successfully created data connection", {
      operation: "createDataConnection",
      metadata: { data_connection_id: validated.data.data_connection_id },
    });

    const newId = validated.data.data_connection_id;
    revalidatePath(
      owner ? accountDataConnectionsUrl(owner) : adminDataConnectionsUrl()
    );

    // Navigate client-side (see FormState.redirectTo) so the shared layout is
    // refetched with the current session, rather than a server redirect() that
    // leaves the client Router Cache stale. Land on the new connection's page.
    return {
      fieldErrors: {},
      data: formData,
      message: "Data connection created successfully!",
      success: true,
      redirectTo: owner
        ? accountDataConnectionEditUrl(owner, newId)
        : adminDataConnectionEditUrl(newId),
    };
  } catch (error) {
    LOGGER.error("Error creating data connection", {
      operation: "createDataConnection",
      error,
    });

    return {
      fieldErrors: {},
      data: formData,
      message: "Failed to create data connection. Please try again.",
      success: false,
    };
  }
}

export async function updateDataConnection(
  _prevState: FormState<DataConnection>,
  formData: FormData
): Promise<FormState<DataConnection>> {
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthenticated",
      success: false,
    };
  }

  const dataConnectionId = formData.get("data_connection_id") as string;
  if (!dataConnectionId) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Data connection ID is required",
      success: false,
    };
  }

  try {
    const existing = await dataConnectionsTable.fetchById(dataConnectionId);
    if (!existing) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Data connection not found",
        success: false,
      };
    }

    if (
      !(await canManageConnection(
        session,
        existing,
        isAuthorized(session, existing, Actions.PutDataConnection)
      ))
    ) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Unauthorized to update data connections",
        success: false,
      };
    }

    // `existing` lets blank secret fields fall back to the stored credentials,
    // and preserves `owner` (the form never changes it), so an account can't
    // be edited into giving its connection away.
    const dataConnection = buildDataConnectionFromForm(formData, existing);
    const validated = DataConnectionSchema.safeParse(dataConnection);
    if (!validated.success) {
      return {
        fieldErrors: fieldErrorsFromZod(validated.error),
        data: formData,
        message: "Invalid form data",
        success: false,
      };
    }

    try {
      // update() requires the row to still exist; a concurrent delete between
      // the fetchById above and here would otherwise resurrect a partial ghost.
      await dataConnectionsTable.update(validated.data);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        return {
          fieldErrors: {},
          data: formData,
          message: "Data connection was deleted concurrently",
          success: false,
        };
      }
      throw error;
    }

    LOGGER.info("Successfully updated data connection", {
      operation: "updateDataConnection",
      metadata: { data_connection_id: dataConnectionId },
    });

    if (existing.owner) {
      revalidatePath(accountDataConnectionsUrl(existing.owner));
      revalidatePath(
        accountDataConnectionEditUrl(existing.owner, dataConnectionId)
      );
    } else {
      revalidatePath(adminDataConnectionsUrl());
      revalidatePath(adminDataConnectionEditUrl(dataConnectionId));
    }

    return {
      fieldErrors: {},
      data: formData,
      message: "Data connection updated successfully!",
      success: true,
    };
  } catch (error) {
    LOGGER.error("Error updating data connection", {
      operation: "updateDataConnection",
      error,
    });

    return {
      fieldErrors: {},
      data: formData,
      message: "Failed to update data connection. Please try again.",
      success: false,
    };
  }
}

export async function deleteDataConnection(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthenticated",
      success: false,
    };
  }

  const dataConnectionId = formData.get("data_connection_id") as string;
  if (!dataConnectionId) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Data connection ID is required",
      success: false,
    };
  }

  try {
    const existing = await dataConnectionsTable.fetchById(dataConnectionId);
    if (!existing) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Data connection not found",
        success: false,
      };
    }

    if (
      !(await canManageConnection(
        session,
        existing,
        isAuthorized(session, existing, Actions.DeleteDataConnection)
      ))
    ) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Unauthorized to delete data connections",
        success: false,
      };
    }

    // Refuse to delete a connection still referenced by product mirrors —
    // deleting would leave those products with a dangling connection_id. The
    // admin must detach it from each product first.
    const dependents =
      await productsTable.listProductsByConnectionId(dataConnectionId);
    if (dependents.length > 0) {
      return {
        fieldErrors: {},
        data: formData,
        message: `Cannot delete: ${dependents.length} product(s) still use this connection. Remove it from them first.`,
        success: false,
      };
    }

    await dataConnectionsTable.delete(dataConnectionId);

    LOGGER.info("Successfully deleted data connection", {
      operation: "deleteDataConnection",
      metadata: { data_connection_id: dataConnectionId },
    });

    const listUrl = existing.owner
      ? accountDataConnectionsUrl(existing.owner)
      : adminDataConnectionsUrl();
    revalidatePath(listUrl);

    return {
      fieldErrors: {},
      data: formData,
      message: "Data connection deleted successfully!",
      success: true,
      redirectTo: listUrl,
    };
  } catch (error) {
    LOGGER.error("Error deleting data connection", {
      operation: "deleteDataConnection",
      error,
    });

    return {
      fieldErrors: {},
      data: formData,
      message: "Failed to delete data connection. Please try again.",
      success: false,
    };
  }
}

/**
 * Maps Zod issues to form-field errors keyed by the field's *leaf* name (e.g.
 * `role_arn`, `region`), not the top-level object key — `ZodError.flatten()`
 * only keys top-level fields, so nested `details.*` / `authentication.*` errors
 * would otherwise never render next to their inputs.
 *
 * Keying by leaf (rather than the full dotted path) is deliberate: the form is a
 * flat namespace where every `<input name>` is a unique leaf, so leaf keys map
 * 1:1 to inputs and cannot collide. A dotted path (`details.region`) would be
 * more "unique" but would no longer match the form's leaf-based lookups.
 */
function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const stringSegments = issue.path.filter(
      (segment): segment is string => typeof segment === "string"
    );
    const key = stringSegments[stringSegments.length - 1] ?? "form";
    const messages = (fieldErrors[key] ??= []);
    if (!messages.includes(issue.message)) messages.push(issue.message);
  }
  return fieldErrors;
}

/**
 * Maps the data connection form fields to a `DataConnection`-shaped object for
 * validation. `existing` (edit only) supplies the stored secret values when the
 * corresponding form field is left blank, so editing non-secret fields does not
 * wipe credentials the form deliberately never renders.
 */
function buildDataConnectionFromForm(
  formData: FormData,
  existing?: DataConnection
): Record<string, unknown> {
  const provider = formData.get("provider") as string;
  const authType = formData.get("auth_type") as string;

  const allowedVisibilities = Object.values(ProductVisibility).filter(
    (visibility) => formData.get(`visibility_${visibility}`) === "on"
  );

  let details: Record<string, unknown>;
  if (provider === DataProvider.S3) {
    const endpoint = (formData.get("endpoint") as string) || undefined;
    details = {
      provider: DataProvider.S3,
      bucket: formData.get("bucket") as string,
      base_prefix: (formData.get("base_prefix") as string) || "",
      region: formData.get("region") as string,
      // Omit when blank so AWS S3 connections have no endpoint field.
      ...(endpoint ? { endpoint } : {}),
    };
  } else if (provider === DataProvider.GCP) {
    details = {
      provider: DataProvider.GCP,
      bucket: formData.get("bucket") as string,
      base_prefix: (formData.get("base_prefix") as string) || "",
    };
  } else {
    details = {
      provider: DataProvider.Azure,
      account_name: formData.get("account_name") as string,
      container_name: formData.get("container_name") as string,
      base_prefix: (formData.get("base_prefix") as string) || "",
      region: formData.get("region") as string,
    };
  }

  const authentication = buildAuthenticationFromForm(
    authType,
    formData,
    existing
  );

  const requiredFlag = formData.get("required_flag") as string;

  // Owner is never client-editable: on edit it is preserved from the stored
  // connection; on create it comes from the account-scoped page's hidden
  // `owner` field (validated against the caller's role before the write).
  const owner = existing
    ? existing.owner
    : (formData.get("owner") as string) || undefined;

  return {
    data_connection_id: formData.get("data_connection_id") as string,
    name: formData.get("name") as string,
    prefix_template: (formData.get("prefix_template") as string) || undefined,
    read_only: formData.get("read_only") === "on",
    allowed_visibilities: allowedVisibilities,
    // required_flag is a platform-only gate; an owned connection never carries
    // one (it's already isolated to the owner's products), so drop it even if a
    // crafted POST supplies it.
    required_flag: owner ? undefined : requiredFlag || undefined,
    owner,
    details,
    authentication,
  };
}

function buildAuthenticationFromForm(
  authType: string,
  formData: FormData,
  existing?: DataConnection
): Record<string, unknown> | undefined {
  // Reuse a stored secret only when the connection still uses the same auth type.
  const previous =
    existing?.authentication?.type === authType
      ? existing.authentication
      : undefined;

  switch (authType) {
    case DataConnectionAuthenticationType.S3AccessKey: {
      const prev =
        previous?.type === DataConnectionAuthenticationType.S3AccessKey
          ? previous
          : undefined;
      return {
        type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id:
          (formData.get("access_key_id") as string) || prev?.access_key_id || "",
        secret_access_key:
          (formData.get("secret_access_key") as string) ||
          prev?.secret_access_key ||
          "",
      };
    }
    case DataConnectionAuthenticationType.S3WebIdentityRole:
      return {
        type: DataConnectionAuthenticationType.S3WebIdentityRole,
        role_arn: formData.get("role_arn") as string,
      };
    case DataConnectionAuthenticationType.GcpWorkloadIdentity:
      return {
        type: DataConnectionAuthenticationType.GcpWorkloadIdentity,
        workload_identity_provider: formData.get(
          "workload_identity_provider"
        ) as string,
        service_account: formData.get("service_account") as string,
      };
    case DataConnectionAuthenticationType.AzureWorkloadIdentity:
      return {
        type: DataConnectionAuthenticationType.AzureWorkloadIdentity,
        tenant_id: formData.get("tenant_id") as string,
        client_id: formData.get("client_id") as string,
      };
    case DataConnectionAuthenticationType.AzureSasToken: {
      const prev =
        previous?.type === DataConnectionAuthenticationType.AzureSasToken
          ? previous
          : undefined;
      return {
        type: DataConnectionAuthenticationType.AzureSasToken,
        sas_token:
          (formData.get("sas_token") as string) || prev?.sas_token || "",
      };
    }
    default:
      return undefined;
  }
}
