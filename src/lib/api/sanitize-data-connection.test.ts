/** @jest-environment node */
import { canViewDataConnectionConfig } from "./authz";
import { sanitizeDataConnection } from "./sanitize-data-connection";
import { sessions } from "./utils.mock";
import {
  DataConnection,
  DataConnectionAuthenticationType,
  MembershipState,
  ProductVisibility,
  UserSession,
} from "@/types";

const memberOfAcme = {
  identity_id: "alice",
  account: { account_id: "alice" },
  memberships: [
    { membership_account_id: "acme", state: MembershipState.Member },
  ],
} as unknown as UserSession;

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
  role_arn: "arn:aws:iam::1:role/r",
};
const keyAuth = {
  type: DataConnectionAuthenticationType.S3AccessKey,
  access_key_id: "AKIA",
  secret_access_key: "secret",
};

describe("canViewDataConnectionConfig", () => {
  test("public ⇒ anyone, including anonymous", () => {
    const c = conn({
      allowed_visibilities: [ProductVisibility.Public],
      owner: "acme",
    });
    expect(canViewDataConnectionConfig(sessions["anonymous"], c)).toBe(true);
    expect(canViewDataConnectionConfig(nonMember, c)).toBe(true);
  });

  test("unowned + non-public ⇒ anyone", () => {
    const c = conn({ allowed_visibilities: [ProductVisibility.Restricted] });
    expect(canViewDataConnectionConfig(sessions["anonymous"], c)).toBe(true);
    expect(canViewDataConnectionConfig(nonMember, c)).toBe(true);
  });

  test("owned + non-public ⇒ members of the owner only", () => {
    const c = conn({
      allowed_visibilities: [ProductVisibility.Restricted],
      owner: "acme",
    });
    expect(canViewDataConnectionConfig(memberOfAcme, c)).toBe(true);
    expect(canViewDataConnectionConfig(nonMember, c)).toBe(false);
    expect(canViewDataConnectionConfig(sessions["anonymous"], c)).toBe(false);
  });

  test("the owner's own (individual) account counts", () => {
    const c = conn({ allowed_visibilities: [], owner: "bob" });
    expect(canViewDataConnectionConfig(nonMember, c)).toBe(true);
  });
});

describe("sanitizeDataConnection", () => {
  test("strips secret-bearing auth for non-admins even when visible", () => {
    const c = conn({
      allowed_visibilities: [ProductVisibility.Public],
      authentication: keyAuth as never,
    });
    expect(
      sanitizeDataConnection(c, sessions["anonymous"]).authentication
    ).toBeUndefined();
  });

  test("keeps secret-less auth when the caller may view the config", () => {
    const c = conn({
      allowed_visibilities: [ProductVisibility.Public],
      authentication: roleAuth as never,
    });
    expect(
      sanitizeDataConnection(c, sessions["anonymous"]).authentication
    ).toEqual(roleAuth);
  });

  test("strips secret-less auth when the caller may NOT view the config", () => {
    const c = conn({
      allowed_visibilities: [ProductVisibility.Restricted],
      owner: "acme",
      authentication: roleAuth as never,
    });
    expect(sanitizeDataConnection(c, nonMember).authentication).toBeUndefined();
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
