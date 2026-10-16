"use server";

import {
  DataConnection,
  DataProvider,
  DataConnectionAuthenticationType,
  ProductVisibility,
} from "@/types";
import { LOGGER } from "@/lib/logging";
import { getPageSession } from "../api/utils";
import * as ops from "../operations/data-connections";
import { OperationResult, toFormState } from "../operations/result";
import { FormState } from "@/components/core/DynamicForm";
import { revalidatePath } from "next/cache";
import {
  adminDataConnectionsUrl,
  adminDataConnectionEditUrl,
  accountDataConnectionsUrl,
  accountDataConnectionEditUrl,
} from "@/lib/urls";

const listUrl = (c: DataConnection) =>
  c.owner ? accountDataConnectionsUrl(c.owner) : adminDataConnectionsUrl();

const editUrl = (c: DataConnection) =>
  c.owner
    ? accountDataConnectionEditUrl(c.owner, c.data_connection_id)
    : adminDataConnectionEditUrl(c.data_connection_id);

/**
 * The operation names a field by its path (`details.region`); the form names
 * each input by its leaf (`region`), and every leaf in the form is unique.
 */
function byLeaf<T>(state: FormState<T>): FormState<T> {
  const fieldErrors: Record<string, string[]> = {};
  for (const [path, messages] of Object.entries(state.fieldErrors)) {
    const leaf = path.split(".").findLast((s) => isNaN(Number(s))) ?? "form";
    (fieldErrors[leaf] ??= []).push(...messages);
  }
  return { ...state, fieldErrors };
}

/**
 * Runs `operation` as the visitor and answers the form. A changed connection's
 * list and page are revalidated and, given `redirectTo`, the browser is sent on
 * to that page of it: a client-side navigation (see FormState.redirectTo)
 * refetches the shared layout with the current session. Anything thrown is
 * logged and reported on the form, which keeps what the visitor typed.
 */
async function respond<T>(
  operation: (
    session: Awaited<ReturnType<typeof getPageSession>>
  ) => Promise<OperationResult<DataConnection>>,
  formData: FormData,
  message: string,
  redirectTo?: (c: DataConnection) => string
): Promise<FormState<T>> {
  let result: OperationResult<DataConnection>;
  try {
    result = await operation(await getPageSession());
  } catch (error) {
    LOGGER.error("Data connection action failed", {
      operation: "data-connection form",
      metadata: { data_connection_id: connectionId(formData) },
      error,
    });
    return {
      success: false,
      data: formData,
      message: "Something went wrong. Please try again.",
      fieldErrors: {},
    };
  }
  if (result.ok) {
    revalidatePath(listUrl(result.value));
    revalidatePath(editUrl(result.value));
  }
  const url = result.ok && redirectTo ? redirectTo(result.value) : undefined;
  return byLeaf(toFormState(result, formData, message, url) as FormState<T>);
}

const connectionId = (formData: FormData) =>
  String(formData.get("data_connection_id") ?? "");

export async function createDataConnection(
  _prevState: FormState<DataConnection>,
  formData: FormData
): Promise<FormState<DataConnection>> {
  return respond(
    (session) =>
      ops.createDataConnection(session, buildDataConnectionFromForm(formData)),
    formData,
    "Data connection created successfully!",
    editUrl
  );
}

export async function updateDataConnection(
  _prevState: FormState<DataConnection>,
  formData: FormData
): Promise<FormState<DataConnection>> {
  return respond(
    (session) =>
      ops.updateDataConnection(
        session,
        connectionId(formData),
        buildDataConnectionFromForm(formData)
      ),
    formData,
    "Data connection updated successfully!"
  );
}

export async function deleteDataConnection(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  return respond(
    (session) => ops.deleteDataConnection(session, connectionId(formData)),
    formData,
    "Data connection deleted successfully!",
    listUrl
  );
}

/**
 * Maps the data connection form fields to a `DataConnection`-shaped object.
 * It only reshapes; the operation validates, derives the id, and keeps stored
 * secrets for the secret fields the form leaves blank.
 */
function buildDataConnectionFromForm(
  formData: FormData
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
  } else if (provider === DataProvider.GCS) {
    details = {
      provider: DataProvider.GCS,
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

  return {
    name: (formData.get("name") as string) ?? "",
    prefix_template: (formData.get("prefix_template") as string) || undefined,
    read_only: formData.get("read_only") === "on",
    allowed_visibilities: allowedVisibilities,
    required_flag: (formData.get("required_flag") as string) || undefined,
    // The account-scoped create page posts its account here. The id is built
    // from it and the schema only accepts a lowercase one, so "ACME" from an
    // admin's hand still lands in the "acme" account's list.
    owner:
      ((formData.get("owner") as string) || "").trim().toLowerCase() ||
      undefined,
    details,
    authentication: buildAuthenticationFromForm(authType, formData),
  };
}

function buildAuthenticationFromForm(
  authType: string,
  formData: FormData
): Record<string, unknown> | undefined {
  switch (authType) {
    case DataConnectionAuthenticationType.S3AccessKey:
      return {
        type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: (formData.get("access_key_id") as string) || "",
        secret_access_key: (formData.get("secret_access_key") as string) || "",
      };
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
    case DataConnectionAuthenticationType.AzureSasToken:
      return {
        type: DataConnectionAuthenticationType.AzureSasToken,
        sas_token: (formData.get("sas_token") as string) || "",
      };
    default:
      return undefined;
  }
}
