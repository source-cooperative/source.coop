/** @jest-environment node */
import { sanitizeDataConnection } from "./sanitize-data-connection";
import {
  DataConnection,
  DataConnectionAuthenticationType,
  ProductVisibility,
} from "@/types";

function conn(over: Partial<DataConnection>): DataConnection {
  return {
    data_connection_id: "conn-1",
    name: "Conn",
    read_only: true,
    allowed_visibilities: [],
    details: {
      provider: "s3",
      bucket: "b",
      base_prefix: "",
      region: "us-west-2",
    },
    ...over,
  } as DataConnection;
}

const roleAuth = {
  type: DataConnectionAuthenticationType.S3WebIdentityRole,
  role_arn: "arn:aws:iam::123456789012:role/r",
};
const keyAuth = {
  type: DataConnectionAuthenticationType.S3AccessKey,
  access_key_id: "AKIA",
  secret_access_key: "secret",
};

describe("sanitizeDataConnection", () => {
  test("strips secret-bearing auth for every caller (secrets are write-only)", () => {
    const c = conn({ authentication: keyAuth as never });
    expect(sanitizeDataConnection(c).authentication).toBeUndefined();
  });

  test("keeps secret-less (federated) auth regardless of owner/visibility", () => {
    // role_arn is not a credential — the IAM trust policy is the boundary — so
    // nothing gates it; a private, owned connection still returns it.
    const c = conn({
      allowed_visibilities: [ProductVisibility.Restricted],
      owner: "acme",
      authentication: roleAuth as never,
    });
    expect(sanitizeDataConnection(c).authentication).toEqual(roleAuth);
  });

  test("passes through a connection with no authentication", () => {
    expect(sanitizeDataConnection(conn({})).authentication).toBeUndefined();
  });
});
