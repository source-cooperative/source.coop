/** @jest-environment node */
import {
  DataConnectionAuthenticationSchema,
  DataConnectionAuthenticationType,
  DataConnectionSchema,
  DataConnnectionDetailsSchema,
  DataProvider,
  isSecretBearingAuth,
} from "./data-connection";

describe("DataConnection V2 workload-identity variants", () => {
  test("parses the s3_web_identity_role variant", () => {
    const auth = DataConnectionAuthenticationSchema.parse({
      type: "s3_web_identity_role",
      role_arn: "arn:aws:iam::123456789012:role/source-coop",
    });
    expect(auth.type).toBe(DataConnectionAuthenticationType.S3WebIdentityRole);
    expect(auth).toMatchObject({
      role_arn: "arn:aws:iam::123456789012:role/source-coop",
    });
  });

  test("rejects s3_web_identity_role without a role_arn", () => {
    expect(() =>
      DataConnectionAuthenticationSchema.parse({ type: "s3_web_identity_role" })
    ).toThrow();
  });

  test("parses the scaffolded gcp_workload_identity variant", () => {
    const auth = DataConnectionAuthenticationSchema.parse({
      type: "gcp_workload_identity",
      workload_identity_provider:
        "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/p/providers/pr",
      service_account: "sa@project.iam.gserviceaccount.com",
    });
    expect(auth.type).toBe(DataConnectionAuthenticationType.GcpWorkloadIdentity);
  });

  test("parses the scaffolded azure_workload_identity variant", () => {
    const auth = DataConnectionAuthenticationSchema.parse({
      type: "azure_workload_identity",
      tenant_id: "00000000-0000-0000-0000-000000000000",
      client_id: "11111111-1111-1111-1111-111111111111",
    });
    expect(auth.type).toBe(
      DataConnectionAuthenticationType.AzureWorkloadIdentity
    );
  });

  test("rejects gcp_workload_identity without workload_identity_provider", () => {
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "gcp_workload_identity",
        service_account: "sa@project.iam.gserviceaccount.com",
      })
    ).toThrow();
  });

  test("rejects gcp_workload_identity without service_account", () => {
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "gcp_workload_identity",
        workload_identity_provider:
          "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/p/providers/pr",
      })
    ).toThrow();
  });

  test("rejects azure_workload_identity without tenant_id", () => {
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "azure_workload_identity",
        client_id: "11111111-1111-1111-1111-111111111111",
      })
    ).toThrow();
  });

  test("rejects azure_workload_identity without client_id", () => {
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "azure_workload_identity",
        tenant_id: "00000000-0000-0000-0000-000000000000",
      })
    ).toThrow();
  });

  test("rejects s3_web_identity_role with an empty role_arn", () => {
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "s3_web_identity_role",
        role_arn: "",
      })
    ).toThrow();
  });

  test("rejects gcp_workload_identity with empty string fields", () => {
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "gcp_workload_identity",
        workload_identity_provider: "",
        service_account: "sa@project.iam.gserviceaccount.com",
      })
    ).toThrow();
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "gcp_workload_identity",
        workload_identity_provider:
          "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/p/providers/pr",
        service_account: "",
      })
    ).toThrow();
  });

  test("rejects azure_workload_identity with empty string fields", () => {
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "azure_workload_identity",
        tenant_id: "",
        client_id: "11111111-1111-1111-1111-111111111111",
      })
    ).toThrow();
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "azure_workload_identity",
        tenant_id: "00000000-0000-0000-0000-000000000000",
        client_id: "",
      })
    ).toThrow();
  });

  test("accepts a GovCloud role_arn (partition-tolerant)", () => {
    const auth = DataConnectionAuthenticationSchema.parse({
      type: "s3_web_identity_role",
      role_arn: "arn:aws-us-gov:iam::123456789012:role/team/source-coop",
    });
    expect(auth.type).toBe(DataConnectionAuthenticationType.S3WebIdentityRole);
  });

  test("rejects a role_arn that is not an IAM role ARN", () => {
    for (const role_arn of [
      "not-an-arn",
      "arn:aws:s3:::some-bucket",
      "arn:aws:iam::abc:role/source-coop",
      // role name with a space — invalid IAM character, must be rejected here
      // rather than slipping through to an STS failure at call time
      "arn:aws:iam::123456789012:role/foo bar",
      // role name with an otherwise-invalid character
      "arn:aws:iam::123456789012:role/source$coop",
    ]) {
      expect(() =>
        DataConnectionAuthenticationSchema.parse({
          type: "s3_web_identity_role",
          role_arn,
        })
      ).toThrow();
    }
  });

  test("rejects a workload_identity_provider with the wrong prefix", () => {
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "gcp_workload_identity",
        workload_identity_provider: "https://iam.googleapis.com/projects/123",
        service_account: "sa@project.iam.gserviceaccount.com",
      })
    ).toThrow();
  });

  test("rejects a service_account that is not a gserviceaccount.com email", () => {
    for (const service_account of [
      "not-an-email",
      "user@gmail.com",
      // missing the `.iam.` subdomain — not a valid user-managed SA format
      "sa@project.gserviceaccount.com",
    ]) {
      expect(() =>
        DataConnectionAuthenticationSchema.parse({
          type: "gcp_workload_identity",
          workload_identity_provider:
            "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/p/providers/pr",
          service_account,
        })
      ).toThrow();
    }
  });

  test("rejects azure_workload_identity with non-UUID ids", () => {
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "azure_workload_identity",
        tenant_id: "contoso",
        client_id: "11111111-1111-1111-1111-111111111111",
      })
    ).toThrow();
    expect(() =>
      DataConnectionAuthenticationSchema.parse({
        type: "azure_workload_identity",
        tenant_id: "00000000-0000-0000-0000-000000000000",
        client_id: "not-a-uuid",
      })
    ).toThrow();
  });

  test("authentication field is optional and absent by default", () => {
    const dc = DataConnectionSchema.parse({
      data_connection_id: "conn-1",
      name: "Conn",
      read_only: true,
      allowed_visibilities: [],
      details: {
        provider: "s3",
        bucket: "example-bucket",
        base_prefix: "",
        region: "us-west-2",
      },
    });
    expect(dc.authentication).toBeUndefined();
  });
});

describe("isSecretBearingAuth", () => {
  test("static-credential variants are secret-bearing", () => {
    expect(
      isSecretBearingAuth({
        type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: "AKIA",
        secret_access_key: "s",
      })
    ).toBe(true);
    expect(
      isSecretBearingAuth({
        type: DataConnectionAuthenticationType.AzureSasToken,
        sas_token: "t",
      })
    ).toBe(true);
  });

  test("federation variants are secret-less", () => {
    expect(
      isSecretBearingAuth({
        type: DataConnectionAuthenticationType.S3WebIdentityRole,
        role_arn: "arn:aws:iam::1:role/r",
      })
    ).toBe(false);
    expect(
      isSecretBearingAuth({
        type: DataConnectionAuthenticationType.GcpWorkloadIdentity,
        workload_identity_provider: "p",
        service_account: "sa",
      })
    ).toBe(false);
  });
});

describe("DataConnectionDetails (S3-compatible + GCP variants)", () => {
  test("parses an S3-compatible (R2) connection with a custom endpoint", () => {
    const details = DataConnnectionDetailsSchema.parse({
      provider: "s3",
      bucket: "my-bucket",
      base_prefix: "",
      region: "auto",
      endpoint: "https://abc123.r2.cloudflarestorage.com",
    });
    expect(details.provider).toBe(DataProvider.S3);
    expect(details).toMatchObject({
      region: "auto",
      endpoint: "https://abc123.r2.cloudflarestorage.com",
    });
  });

  test("endpoint is optional for AWS S3", () => {
    const details = DataConnnectionDetailsSchema.parse({
      provider: "s3",
      bucket: "my-bucket",
      base_prefix: "",
      region: "us-east-1",
    });
    expect("endpoint" in details && details.endpoint).toBeFalsy();
  });

  test("rejects a non-URL endpoint", () => {
    expect(() =>
      DataConnnectionDetailsSchema.parse({
        provider: "s3",
        bucket: "my-bucket",
        base_prefix: "",
        region: "auto",
        endpoint: "not-a-url",
      })
    ).toThrow();
  });

  test("parses a GCP (GCS) connection", () => {
    const details = DataConnnectionDetailsSchema.parse({
      provider: "gcp",
      bucket: "my-gcs-bucket",
      base_prefix: "data/",
    });
    expect(details.provider).toBe(DataProvider.GCP);
    expect(details).toMatchObject({ bucket: "my-gcs-bucket" });
  });

  test.each([
    ["a URI-style name", "s3://my-bucket"],
    ["a name with slashes", "my-bucket/data"],
    ["an empty name", ""],
  ])("rejects %s as a bucket", (_label, bucket) => {
    expect(() =>
      DataConnnectionDetailsSchema.parse({
        provider: "s3",
        bucket,
        base_prefix: "",
        region: "us-east-1",
      })
    ).toThrow();
  });

  test("rejects a URI-style Azure container name", () => {
    expect(() =>
      DataConnnectionDetailsSchema.parse({
        provider: "az",
        account_name: "acct",
        container_name: "https://acct.blob.core.windows.net/container",
        base_prefix: "",
        region: "westeurope",
      })
    ).toThrow();
  });

  test("parses a full GCP connection with workload-identity auth", () => {
    const dc = DataConnectionSchema.parse({
      data_connection_id: "gcs-conn",
      name: "GCS",
      read_only: false,
      allowed_visibilities: [],
      details: { provider: "gcp", bucket: "my-gcs-bucket", base_prefix: "" },
      authentication: {
        type: "gcp_workload_identity",
        workload_identity_provider:
          "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/p/providers/pr",
        service_account: "sa@my-project.iam.gserviceaccount.com",
      },
    });
    expect(dc.details.provider).toBe(DataProvider.GCP);
    expect(dc.authentication?.type).toBe(
      DataConnectionAuthenticationType.GcpWorkloadIdentity
    );
  });
});

describe("DataConnection provider ↔ authentication cross-validation", () => {
  const baseFields = {
    data_connection_id: "conn-1",
    name: "Conn",
    read_only: false,
    allowed_visibilities: [],
  };
  const s3Details = {
    provider: "s3",
    bucket: "example-bucket",
    base_prefix: "",
    region: "us-west-2",
  };
  const gcpDetails = { provider: "gcp", bucket: "example-bucket", base_prefix: "" };
  const s3WebIdentityAuth = {
    type: "s3_web_identity_role",
    role_arn: "arn:aws:iam::123456789012:role/source-coop",
  };
  const gcpAuth = {
    type: "gcp_workload_identity",
    workload_identity_provider:
      "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/p/providers/pr",
    service_account: "sa@project.iam.gserviceaccount.com",
  };

  test("accepts an S3 provider paired with an S3 auth variant", () => {
    const dc = DataConnectionSchema.parse({
      ...baseFields,
      details: s3Details,
      authentication: s3WebIdentityAuth,
    });
    expect(dc.authentication?.type).toBe(
      DataConnectionAuthenticationType.S3WebIdentityRole
    );
  });

  test("accepts a GCP provider paired with the GCP auth variant", () => {
    const dc = DataConnectionSchema.parse({
      ...baseFields,
      details: gcpDetails,
      authentication: gcpAuth,
    });
    expect(dc.authentication?.type).toBe(
      DataConnectionAuthenticationType.GcpWorkloadIdentity
    );
  });

  test("rejects a GCP provider paired with an S3 auth variant", () => {
    expect(() =>
      DataConnectionSchema.parse({
        ...baseFields,
        details: gcpDetails,
        authentication: s3WebIdentityAuth,
      })
    ).toThrow();
  });

  test("rejects an S3 provider paired with the GCP auth variant", () => {
    expect(() =>
      DataConnectionSchema.parse({
        ...baseFields,
        details: s3Details,
        authentication: gcpAuth,
      })
    ).toThrow();
  });

  test("allows a connection with no authentication regardless of provider", () => {
    const dc = DataConnectionSchema.parse({
      ...baseFields,
      read_only: true,
      details: gcpDetails,
    });
    expect(dc.authentication).toBeUndefined();
  });

  test("rejects an unsigned (no-auth) connection that is not read-only", () => {
    expect(() =>
      DataConnectionSchema.parse({
        ...baseFields,
        read_only: false,
        details: s3Details,
      })
    ).toThrow();
  });

  test("accepts an unsigned (no-auth) connection that is read-only", () => {
    const dc = DataConnectionSchema.parse({
      ...baseFields,
      read_only: true,
      details: s3Details,
    });
    expect(dc.read_only).toBe(true);
  });
});
