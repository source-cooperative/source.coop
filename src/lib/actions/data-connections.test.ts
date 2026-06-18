import {
  createDataConnection,
  updateDataConnection,
  deleteDataConnection,
} from "./data-connections";
import { dataConnectionsTable } from "../clients";
import { getPageSession } from "../api/utils";
import { isAuthorized } from "../api/authz";
import {
  DataConnection,
  DataConnectionAuthenticationType,
  DataProvider,
} from "@/types";

jest.mock("../clients", () => ({
  dataConnectionsTable: {
    fetchById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../api/utils", () => ({
  getPageSession: jest.fn(),
}));

jest.mock("../api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockTable = dataConnectionsTable as jest.Mocked<typeof dataConnectionsTable>;
const mockGetPageSession = getPageSession as jest.MockedFunction<
  typeof getPageSession
>;
const mockIsAuthorized = isAuthorized as jest.MockedFunction<
  typeof isAuthorized
>;

const FORM_STATE = {
  message: "",
  data: new FormData(),
  fieldErrors: {},
  success: false,
};

function formDataFor(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

const baseS3Fields = {
  data_connection_id: "my-connection",
  name: "My Connection",
  prefix_template: "{{repository.account_id}}/{{repository.repository_id}}/",
  provider: DataProvider.S3,
  bucket: "my-bucket",
  base_prefix: "",
  region: "us-east-1",
  visibility_public: "on",
};

const baseAzureFields = {
  data_connection_id: "azure-connection",
  name: "Azure Connection",
  provider: DataProvider.Azure,
  account_name: "myaccount",
  container_name: "mycontainer",
  base_prefix: "",
  region: "westeurope",
  visibility_public: "on",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPageSession.mockResolvedValue({
    identity_id: "id-1",
  } as Awaited<ReturnType<typeof getPageSession>>);
  mockIsAuthorized.mockReturnValue(true);
  mockTable.fetchById.mockResolvedValue(null);
  mockTable.create.mockImplementation(async (dc) => dc);
  mockTable.update.mockImplementation(async (dc) => dc);
});

describe("createDataConnection", () => {
  test("rejects an unauthenticated caller before any write", async () => {
    mockGetPageSession.mockResolvedValue(null);

    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        auth_type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: "AKIA",
        secret_access_key: "secret",
      })
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Unauthenticated");
    expect(mockTable.create).not.toHaveBeenCalled();
  });

  test("rejects an unauthorized caller before any write", async () => {
    mockIsAuthorized.mockReturnValue(false);

    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        auth_type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: "AKIA",
        secret_access_key: "secret",
      })
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("Unauthorized");
    expect(mockTable.create).not.toHaveBeenCalled();
  });

  test("creates an S3 access-key connection and redirects to the list", async () => {
    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        read_only: "on",
        auth_type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: "AKIA",
        secret_access_key: "secret",
      })
    );

    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe("/admin/data-connections");
    expect(mockTable.create).toHaveBeenCalledTimes(1);
    const created = mockTable.create.mock.calls[0][0];
    expect(created.read_only).toBe(true);
    expect(created.allowed_visibilities).toEqual(["public"]);
    expect(created.details).toMatchObject({
      provider: DataProvider.S3,
      bucket: "my-bucket",
      region: "us-east-1",
    });
    expect(created.authentication).toEqual({
      type: DataConnectionAuthenticationType.S3AccessKey,
      access_key_id: "AKIA",
      secret_access_key: "secret",
    });
  });

  test("creates an S3 web-identity-role connection with a valid ARN", async () => {
    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        auth_type: DataConnectionAuthenticationType.S3WebIdentityRole,
        role_arn: "arn:aws:iam::123456789012:role/my-role",
      })
    );

    expect(result.success).toBe(true);
    expect(mockTable.create.mock.calls[0][0].authentication).toEqual({
      type: DataConnectionAuthenticationType.S3WebIdentityRole,
      role_arn: "arn:aws:iam::123456789012:role/my-role",
    });
  });

  test("reports a leaf-level field error for an invalid role ARN", async () => {
    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        auth_type: DataConnectionAuthenticationType.S3WebIdentityRole,
        role_arn: "not-an-arn",
      })
    );

    expect(result.success).toBe(false);
    // Keyed by leaf name so it renders next to the role_arn input, not under
    // a nested "authentication" key.
    expect(result.fieldErrors.role_arn).toBeDefined();
    expect(mockTable.create).not.toHaveBeenCalled();
  });

  test("creates an Azure SAS-token connection", async () => {
    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseAzureFields,
        auth_type: DataConnectionAuthenticationType.AzureSasToken,
        sas_token: "sv=2021-token",
      })
    );

    expect(result.success).toBe(true);
    expect(mockTable.create.mock.calls[0][0].authentication).toEqual({
      type: DataConnectionAuthenticationType.AzureSasToken,
      sas_token: "sv=2021-token",
    });
  });

  test("rejects a SAS-token connection submitted with a blank token", async () => {
    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseAzureFields,
        auth_type: DataConnectionAuthenticationType.AzureSasToken,
        sas_token: "",
      })
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors.sas_token).toBeDefined();
    expect(mockTable.create).not.toHaveBeenCalled();
  });

  test("creates an Azure workload-identity connection with UUIDs", async () => {
    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseAzureFields,
        auth_type: DataConnectionAuthenticationType.AzureWorkloadIdentity,
        tenant_id: "11111111-1111-1111-1111-111111111111",
        client_id: "22222222-2222-2222-2222-222222222222",
      })
    );

    expect(result.success).toBe(true);
    expect(mockTable.create.mock.calls[0][0].authentication).toMatchObject({
      type: DataConnectionAuthenticationType.AzureWorkloadIdentity,
      tenant_id: "11111111-1111-1111-1111-111111111111",
    });
  });

  test("rejects an existing connection ID", async () => {
    mockTable.fetchById.mockResolvedValue({
      data_connection_id: "my-connection",
    } as DataConnection);

    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        auth_type: DataConnectionAuthenticationType.S3ECSTaskRole,
      })
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors.data_connection_id).toBeDefined();
    expect(mockTable.create).not.toHaveBeenCalled();
  });

  test("translates a conditional-put race into a duplicate-ID error", async () => {
    const conditionalFailure = Object.assign(new Error("conditional"), {
      name: "ConditionalCheckFailedException",
    });
    mockTable.create.mockRejectedValue(conditionalFailure);

    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        auth_type: DataConnectionAuthenticationType.S3Local,
      })
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors.data_connection_id).toBeDefined();
  });
});

describe("updateDataConnection", () => {
  const existingAccessKey: DataConnection = {
    data_connection_id: "my-connection",
    name: "Old name",
    read_only: false,
    allowed_visibilities: [],
    details: {
      provider: DataProvider.S3,
      bucket: "my-bucket",
      base_prefix: "",
      region: "us-east-1",
    },
    authentication: {
      type: DataConnectionAuthenticationType.S3AccessKey,
      access_key_id: "OLD_KEY",
      secret_access_key: "OLD_SECRET",
    },
  } as DataConnection;

  test("preserves stored secrets when secret fields are left blank", async () => {
    mockTable.fetchById.mockResolvedValue(existingAccessKey);

    const result = await updateDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        name: "New name",
        auth_type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: "",
        secret_access_key: "",
      })
    );

    expect(result.success).toBe(true);
    const updated = mockTable.update.mock.calls[0][0];
    expect(updated.authentication).toEqual({
      type: DataConnectionAuthenticationType.S3AccessKey,
      access_key_id: "OLD_KEY",
      secret_access_key: "OLD_SECRET",
    });
  });

  test("does not reuse an old secret when the auth type changes", async () => {
    // Existing connection used a web-identity role; switching to access-key with
    // blank fields must error, not silently resurrect a mismatched secret.
    mockTable.fetchById.mockResolvedValue({
      ...existingAccessKey,
      authentication: {
        type: DataConnectionAuthenticationType.S3WebIdentityRole,
        role_arn: "arn:aws:iam::123456789012:role/my-role",
      },
    } as DataConnection);

    const result = await updateDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        auth_type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: "",
        secret_access_key: "",
      })
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors.access_key_id).toBeDefined();
    expect(result.fieldErrors.secret_access_key).toBeDefined();
    expect(mockTable.update).not.toHaveBeenCalled();
  });

  test("reports not found for a missing connection", async () => {
    mockTable.fetchById.mockResolvedValue(null);

    const result = await updateDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        auth_type: DataConnectionAuthenticationType.S3Local,
      })
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("not found");
    expect(mockTable.update).not.toHaveBeenCalled();
  });
});

describe("deleteDataConnection", () => {
  test("deletes an existing connection and redirects to the list", async () => {
    mockTable.fetchById.mockResolvedValue({
      data_connection_id: "my-connection",
    } as DataConnection);

    const result = await deleteDataConnection(
      FORM_STATE,
      formDataFor({ data_connection_id: "my-connection" })
    );

    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe("/admin/data-connections");
    expect(mockTable.delete).toHaveBeenCalledWith("my-connection");
  });

  test("reports not found without deleting", async () => {
    mockTable.fetchById.mockResolvedValue(null);

    const result = await deleteDataConnection(
      FORM_STATE,
      formDataFor({ data_connection_id: "ghost" })
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("not found");
    expect(mockTable.delete).not.toHaveBeenCalled();
  });
});
