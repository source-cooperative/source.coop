"use server";

import { LOGGER } from "@/lib/logging";
import {
  Actions,
  DataConnectionSchema,
  DataConnection,
  DataProvider,
  DataConnectionAuthenticationType,
} from "@/types";
import { isAuthorized } from "../api/authz";
import { getPageSession } from "../api/utils";
import { dataConnectionsTable } from "../clients";
import { FormState } from "@/components/core/DynamicForm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminDataConnectionsUrl, adminDataConnectionEditUrl } from "@/lib/urls";

export async function createDataConnection(
  initialState: any,
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

    if (
      !isAuthorized(session, validated.data, Actions.CreateDataConnection)
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
          data_connection_id: ["A data connection with this ID already exists"],
        },
        data: formData,
        message: "Data connection ID already exists",
        success: false,
      };
    }

    await dataConnectionsTable.create(validated.data);

    LOGGER.info("Successfully created data connection", {
      operation: "createDataConnection",
      metadata: {
        data_connection_id: validated.data.data_connection_id,
      },
    });

    revalidatePath(adminDataConnectionsUrl());
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

  redirect(adminDataConnectionsUrl());
}

export async function updateDataConnection(
  initialState: any,
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
  initialState: any,
  formData: FormData
): Promise<FormState<any>> {
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

  redirect(adminDataConnectionsUrl());
}

function buildDataConnectionFromForm(formData: FormData): Record<string, any> {
  const provider = formData.get("provider") as string;
  const authType = formData.get("auth_type") as string;

  const allowedDataModes: string[] = [];
  if (formData.get("mode_open") === "on") allowedDataModes.push("open");
  if (formData.get("mode_private") === "on") allowedDataModes.push("private");
  if (formData.get("mode_subscription") === "on")
    allowedDataModes.push("subscription");

  let details: Record<string, any>;
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

  let authentication: Record<string, any> | undefined;
  if (authType === DataConnectionAuthenticationType.S3AccessKey) {
    authentication = {
      type: DataConnectionAuthenticationType.S3AccessKey,
      access_key_id: formData.get("access_key_id") as string,
      secret_access_key: formData.get("secret_access_key") as string,
    };
  } else if (authType === DataConnectionAuthenticationType.AzureSasToken) {
    authentication = {
      type: DataConnectionAuthenticationType.AzureSasToken,
      sas_token: formData.get("sas_token") as string,
    };
  } else if (authType === DataConnectionAuthenticationType.S3ECSTaskRole) {
    authentication = {
      type: DataConnectionAuthenticationType.S3ECSTaskRole,
    };
  } else if (authType === DataConnectionAuthenticationType.S3Local) {
    authentication = {
      type: DataConnectionAuthenticationType.S3Local,
    };
  }

  const requiredFlag = formData.get("required_flag") as string;

  return {
    data_connection_id: formData.get("data_connection_id") as string,
    name: formData.get("name") as string,
    prefix_template: (formData.get("prefix_template") as string) || undefined,
    read_only: formData.get("read_only") === "on",
    allowed_data_modes: allowedDataModes,
    required_flag: requiredFlag || undefined,
    details,
    authentication,
  };
}
