/** @jest-environment node */
import { sanitizeDataConnection } from "./sanitize-data-connection";
import { sessions } from "./utils.mock";
import {
  DataConnection,
  DataConnectionAuthenticationType,
  ProductVisibility,
  UserSession,
} from "@/types";

const nonMember = {
  identity_id: "bob",
  account: { account_id: "bob" },
  memberships: [],
} as unknown as UserSession;

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
  test("strips secret-bearing auth for non-credential-viewers", () => {
    const c = conn({
      allowed_visibilities: [ProductVisibility.Public],
      authentication: keyAuth as never,
    });
    expect(
      sanitizeDataConnection(c, sessions["anonymous"]).authentication
    ).toBeUndefined();
  });

  test("keeps secret-less (federated) auth for any caller", () => {
    const c = conn({
      allowed_visibilities: [ProductVisibility.Public],
      authentication: roleAuth as never,
    });
    expect(
      sanitizeDataConnection(c, sessions["anonymous"]).authentication
    ).toEqual(roleAuth);
  });

  test("keeps secret-less auth even for a non-owner of a private connection", () => {
    // role_arn is not a credential — the IAM trust policy is the boundary — so
    // ownership/visibility no longer gates it (only secret-bearing auth is gated).
    const c = conn({
      allowed_visibilities: [ProductVisibility.Restricted],
      owner: "acme",
      authentication: roleAuth as never,
    });
    expect(sanitizeDataConnection(c, nonMember).authentication).toEqual(
      roleAuth
    );
  });

  test("admins still see secret-bearing auth", () => {
    const c = conn({
      allowed_visibilities: [],
      authentication: keyAuth as never,
    });
    expect(sanitizeDataConnection(c, sessions["admin"]).authentication).toEqual(
      keyAuth
    );
  });
});
