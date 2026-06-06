/** @jest-environment node */
import {
  DataConnectionAuthenticationSchema,
  DataConnectionAuthenticationType,
  DataConnectionSchema,
} from "./data-connection";

describe("DataConnectionAuthentication (V2 web-identity role)", () => {
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

  test("authentication field is optional and absent by default", () => {
    const dc = DataConnectionSchema.parse({
      data_connection_id: "conn-1",
      name: "Conn",
      read_only: false,
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
