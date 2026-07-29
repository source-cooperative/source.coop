import {
  createDataConnection,
  updateDataConnection,
  deleteDataConnection,
} from "./data-connections";
import { dataConnectionsTable, productsTable, accountsTable } from "../clients";
import { getPageSession } from "../api/utils";
import { isAuthorized, canManageAccountDataConnections } from "../api/authz";
import {
  Account,
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
  productsTable: {
    listProductsByConnectionId: jest.fn(),
  },
  accountsTable: {
    fetchById: jest.fn(),
  },
}));

jest.mock("../api/utils", () => ({
  getPageSession: jest.fn(),
}));

jest.mock("../api/authz", () => ({
  isAuthorized: jest.fn(),
  canManageAccountDataConnections: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockTable = dataConnectionsTable as jest.Mocked<typeof dataConnectionsTable>;
const mockProductsTable = productsTable as jest.Mocked<typeof productsTable>;
const mockGetPageSession = getPageSession as jest.MockedFunction<
  typeof getPageSession
>;
const mockIsAuthorized = isAuthorized as jest.MockedFunction<
  typeof isAuthorized
>;
const mockAccountsTable = accountsTable as jest.Mocked<typeof accountsTable>;
const mockCanManage = canManageAccountDataConnections as jest.MockedFunction<
  typeof canManageAccountDataConnections
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
  mockProductsTable.listProductsByConnectionId.mockResolvedValue([]);
  mockAccountsTable.fetchById.mockResolvedValue({
    account_id: "acme",
  } as Account);
  mockCanManage.mockReturnValue(true);
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

  test("creates an S3 access-key connection and redirects to the new connection", async () => {
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
    expect(result.redirectTo).toBe("/admin/data-connections/my-connection");
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

  test("creates an R2 (S3-compatible) connection with a custom endpoint", async () => {
    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        region: "auto",
        endpoint: "https://abc123.r2.cloudflarestorage.com",
        auth_type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: "AKIA",
        secret_access_key: "secret",
      })
    );

    expect(result.success).toBe(true);
    expect(mockTable.create.mock.calls[0][0].details).toMatchObject({
      provider: DataProvider.S3,
      region: "auto",
      endpoint: "https://abc123.r2.cloudflarestorage.com",
    });
  });

  test("omits endpoint for a plain AWS S3 connection", async () => {
    await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        // unsigned (no auth_type) ⇒ must be read-only
        read_only: "on",
      })
    );

    expect(
      "endpoint" in mockTable.create.mock.calls[0][0].details
    ).toBe(false);
  });

  test("creates a GCS connection with workload-identity auth", async () => {
    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        data_connection_id: "gcs-connection",
        name: "GCS Connection",
        provider: DataProvider.GCS,
        bucket: "my-gcs-bucket",
        base_prefix: "",
        visibility_public: "on",
        auth_type: DataConnectionAuthenticationType.GcpWorkloadIdentity,
        workload_identity_provider:
          "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/p/providers/pr",
        service_account: "sa@my-project.iam.gserviceaccount.com",
      })
    );

    expect(result.success).toBe(true);
    expect(mockTable.create.mock.calls[0][0].details).toMatchObject({
      provider: DataProvider.GCS,
      bucket: "my-gcs-bucket",
    });
    expect(mockTable.create.mock.calls[0][0].authentication).toMatchObject({
      type: DataConnectionAuthenticationType.GcpWorkloadIdentity,
      service_account: "sa@my-project.iam.gserviceaccount.com",
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
        // unsigned (no auth_type) ⇒ must be read-only
        read_only: "on",
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
        // unsigned (no auth_type) ⇒ must be read-only
        read_only: "on",
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
        // unsigned (no auth_type) ⇒ must be read-only
        read_only: "on",
      })
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("not found");
    expect(mockTable.update).not.toHaveBeenCalled();
  });

  test("translates a concurrent delete into a clear error", async () => {
    mockTable.fetchById.mockResolvedValue(existingAccessKey);
    const conditionalFailure = Object.assign(new Error("conditional"), {
      name: "ConditionalCheckFailedException",
    });
    mockTable.update.mockRejectedValueOnce(conditionalFailure);

    const result = await updateDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        // unsigned (no auth_type) ⇒ must be read-only
        read_only: "on",
      })
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("deleted concurrently");
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

  test("blocks deletion while products still reference the connection", async () => {
    mockTable.fetchById.mockResolvedValue({
      data_connection_id: "my-connection",
    } as DataConnection);
    mockProductsTable.listProductsByConnectionId.mockResolvedValue([
      { account_id: "acct", product_id: "prod" },
    ] as Awaited<
      ReturnType<typeof productsTable.listProductsByConnectionId>
    >);

    const result = await deleteDataConnection(
      FORM_STATE,
      formDataFor({ data_connection_id: "my-connection" })
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("still use this connection");
    expect(mockTable.delete).not.toHaveBeenCalled();
  });
});

describe("account-owned connections", () => {
  // Posted by the account-scoped page: `owner` hidden field + a bare slug as
  // the id. Caller is not a platform admin, so authorization runs through the
  // owner account (mockCanManage).
  const ownedFields = {
    ...baseS3Fields,
    data_connection_id: "myslug",
    owner: "acme",
    auth_type: DataConnectionAuthenticationType.S3AccessKey,
    access_key_id: "AKIA",
    secret_access_key: "secret",
  };

  test("namespaces the id as ${owner}--${slug} and redirects to the account view", async () => {
    mockIsAuthorized.mockReturnValue(false); // not a platform admin

    const result = await createDataConnection(
      FORM_STATE,
      formDataFor(ownedFields)
    );

    expect(result.success).toBe(true);
    expect(mockCanManage).toHaveBeenCalled();
    const created = mockTable.create.mock.calls[0][0];
    expect(created.data_connection_id).toBe("acme--myslug");
    expect(created.owner).toBe("acme");
    expect(result.redirectTo).toBe(
      "/edit/account/acme/data-connections/acme--myslug"
    );
  });

  test("ignores a required_flag injected via a crafted POST on an owned connection", async () => {
    mockIsAuthorized.mockReturnValue(false);

    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({ ...ownedFields, required_flag: "admin" })
    );

    expect(result.success).toBe(true);
    expect(mockTable.create.mock.calls[0][0].required_flag).toBeUndefined();
  });

  test("rejects a caller who is not an admin of the owner account", async () => {
    mockIsAuthorized.mockReturnValue(false);
    mockCanManage.mockReturnValue(false);

    const result = await createDataConnection(
      FORM_STATE,
      formDataFor(ownedFields)
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("Unauthorized");
    expect(mockTable.create).not.toHaveBeenCalled();
  });

  test("lets a platform admin manage an orphaned connection whose owner was deleted", async () => {
    mockIsAuthorized.mockReturnValue(true); // platform admin
    mockAccountsTable.fetchById.mockResolvedValue(null); // owner account gone
    mockTable.fetchById.mockResolvedValue({
      data_connection_id: "ghost--conn",
      name: "Orphan",
      read_only: false,
      allowed_visibilities: [],
      owner: "ghost",
      details: {
        provider: DataProvider.S3,
        bucket: "b",
        base_prefix: "",
        region: "us-east-1",
      },
    } as DataConnection);

    const result = await deleteDataConnection(
      FORM_STATE,
      formDataFor({ data_connection_id: "ghost--conn" })
    );

    expect(result.success).toBe(true);
    expect(mockTable.delete).toHaveBeenCalledWith("ghost--conn");
    // Admin short-circuits before the (now-missing) owner-account lookup.
    expect(mockAccountsTable.fetchById).not.toHaveBeenCalled();
  });

  test("rejects an admin-created (unowned) id containing the reserved -- delimiter", async () => {
    const result = await createDataConnection(
      FORM_STATE,
      formDataFor({
        ...baseS3Fields,
        data_connection_id: "acme--myconn", // no `owner` field → unowned path
        auth_type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: "AKIA",
        secret_access_key: "secret",
      })
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors.data_connection_id?.[0]).toContain(
      "consecutive hyphens"
    );
    expect(mockTable.create).not.toHaveBeenCalled();
  });
});
