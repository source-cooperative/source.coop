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
} from "@/types";
import { isAuthorized } from "../api/authz";
import { getPageSession } from "../api/utils";
import { dataConnectionsTable, productsTable } from "../clients";
import { FormState } from "@/components/core/DynamicForm";
import { revalidatePath } from "next/cache";
import { adminDataConnectionsUrl, adminDataConnectionEditUrl } from "@/lib/urls";

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

    const secretErrors = missingSecretErrors(validated.data.authentication);
    if (Object.keys(secretErrors).length > 0) {
      return {
        fieldErrors: secretErrors,
        data: formData,
        message: "Invalid form data",
        success: false,
      };
    }

    if (!isAuthorized(session, validated.data, Actions.CreateDataConnection)) {
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

    revalidatePath(adminDataConnectionsUrl());

    // Navigate client-side (see FormState.redirectTo) so the shared admin layout
    // is refetched with the current session, rather than a server redirect()
    // that leaves the client Router Cache stale.
    return {
      fieldErrors: {},
      data: formData,
      message: "Data connection created successfully!",
      success: true,
      redirectTo: adminDataConnectionsUrl(),
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

    if (!isAuthorized(session, existing, Actions.PutDataConnection)) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Unauthorized to update data connections",
        success: false,
      };
    }

    // `existing` lets blank secret fields fall back to the stored credentials,
    // so an admin can edit other fields without re-entering secrets.
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

    const secretErrors = missingSecretErrors(validated.data.authentication);
    if (Object.keys(secretErrors).length > 0) {
      return {
        fieldErrors: secretErrors,
        data: formData,
        message: "Invalid form data",
        success: false,
      };
    }

    await dataConnectionsTable.update(validated.data);

    LOGGER.info("Successfully updated data connection", {
      operation: "updateDataConnection",
      metadata: { data_connection_id: dataConnectionId },
    });

    revalidatePath(adminDataConnectionsUrl());
    revalidatePath(adminDataConnectionEditUrl(dataConnectionId));

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

    if (!isAuthorized(session, existing, Actions.DeleteDataConnection)) {
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

    revalidatePath(adminDataConnectionsUrl());

    return {
      fieldErrors: {},
      data: formData,
      message: "Data connection deleted successfully!",
      success: true,
      redirectTo: adminDataConnectionsUrl(),
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

  return {
    data_connection_id: formData.get("data_connection_id") as string,
    name: formData.get("name") as string,
    prefix_template: (formData.get("prefix_template") as string) || undefined,
    read_only: formData.get("read_only") === "on",
    allowed_visibilities: allowedVisibilities,
    required_flag: requiredFlag || undefined,
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
    case DataConnectionAuthenticationType.S3ECSTaskRole:
      return { type: DataConnectionAuthenticationType.S3ECSTaskRole };
    case DataConnectionAuthenticationType.S3Local:
      return { type: DataConnectionAuthenticationType.S3Local };
    default:
      return undefined;
  }
}

/**
 * The auth schemas accept empty secret strings, and the form leaves secret
 * fields blank on edit (to keep the stored value). This guards the remaining
 * gap: selecting a secret-based auth type but providing no secret — on create,
 * or when switching auth type on edit (where there is no stored value to reuse).
 */
function missingSecretErrors(
  authentication: DataConnection["authentication"]
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (!authentication) return errors;

  if (authentication.type === DataConnectionAuthenticationType.S3AccessKey) {
    if (!authentication.access_key_id) {
      errors.access_key_id = ["Access Key ID is required"];
    }
    if (!authentication.secret_access_key) {
      errors.secret_access_key = ["Secret Access Key is required"];
    }
  } else if (
    authentication.type === DataConnectionAuthenticationType.AzureSasToken
  ) {
    if (!authentication.sas_token) {
      errors.sas_token = ["SAS Token is required"];
    }
  }

  return errors;
}
