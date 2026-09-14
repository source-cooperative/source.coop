import { toEditableDataConnection } from "./redact";
import {
  DataConnection,
  DataConnectionAuthenticationType,
  DataProvider,
} from "@/types";

const connection = (
  authentication: DataConnection["authentication"]
): DataConnection =>
  ({
    data_connection_id: "conn-1",
    name: "Conn 1",
    details: { provider: DataProvider.S3, region: "us-east-1" },
    read_only: false,
    allowed_visibilities: [],
    authentication,
  }) as DataConnection;

describe("toEditableDataConnection", () => {
  it("keeps the access key id but never the secret", () => {
    // React serializes every prop into the RSC payload regardless of what the
    // component renders, so anything left here reaches the browser.
    const redacted = toEditableDataConnection(
      connection({
        type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: "AKIAEXAMPLE",
        secret_access_key: "super-secret",
      })
    );

    expect(redacted.authentication).toEqual({
      type: DataConnectionAuthenticationType.S3AccessKey,
      access_key_id: "AKIAEXAMPLE",
    });
    expect(JSON.stringify(redacted)).not.toContain("super-secret");
  });

  it("strips a SAS token entirely, leaving only the type", () => {
    const redacted = toEditableDataConnection(
      connection({
        type: DataConnectionAuthenticationType.AzureSasToken,
        sas_token: "sv=2021-super-secret",
      })
    );

    expect(redacted.authentication).toEqual({
      type: DataConnectionAuthenticationType.AzureSasToken,
    });
    expect(JSON.stringify(redacted)).not.toContain("super-secret");
  });

  it("keeps the keyless identifiers, which are not secrets", () => {
    const redacted = toEditableDataConnection(
      connection({
        type: DataConnectionAuthenticationType.S3WebIdentityRole,
        role_arn: "arn:aws:iam::123456789012:role/my-role",
      })
    );

    expect(redacted.authentication).toEqual({
      type: DataConnectionAuthenticationType.S3WebIdentityRole,
      role_arn: "arn:aws:iam::123456789012:role/my-role",
    });
  });

  it("passes through a connection with no authentication at all", () => {
    const redacted = toEditableDataConnection(connection(undefined));
    expect(redacted.authentication).toBeUndefined();
  });
});
