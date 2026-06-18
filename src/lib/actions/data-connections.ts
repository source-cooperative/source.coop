"use server";

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
import { dataConnectionsTable } from "../clients";
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
        fieldErrors: validated.error.flatten().fieldErrors,
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

    await dataConnectionsTable.create(validated.data);

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
        fieldErrors: validated.error.flatten().fieldErrors,
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
    details = {
      provider: DataProvider.S3,
      bucket: formData.get("bucket") as string,
      base_prefix: (formData.get("base_prefix") as string) || "",
      region: formData.get("region") as string,
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
