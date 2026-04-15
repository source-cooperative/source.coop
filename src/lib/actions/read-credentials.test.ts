/**
 * @jest-environment node
 */
import { getReadCredentials } from "./read-credentials";

jest.mock("@/lib/api/utils", () => ({
  getPageSession: jest.fn(),
}));

jest.mock("@/lib/api/ory-id-token", () => ({
  getOryIdToken: jest.fn(),
}));

jest.mock("@/lib/config", () => ({
  CONFIG: {
    storage: { endpoint: "https://data.source.coop" },
    environment: { isDevelopment: true },
    auth: { accessToken: "" },
  },
}));

import { getPageSession } from "@/lib/api/utils";
import { getOryIdToken } from "@/lib/api/ory-id-token";

const STS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<AssumeRoleWithWebIdentityResponse>
  <AssumeRoleWithWebIdentityResult>
    <Credentials>
      <AccessKeyId>AKIAREAD</AccessKeyId>
      <SecretAccessKey>readsecret</SecretAccessKey>
      <SessionToken>readsess</SessionToken>
      <Expiration>2026-04-10T13:00:00Z</Expiration>
    </Credentials>
  </AssumeRoleWithWebIdentityResult>
</AssumeRoleWithWebIdentityResponse>`;

describe("getReadCredentials", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    (getPageSession as jest.Mock).mockReset();
    (getOryIdToken as jest.Mock).mockReset();
  });

  test("throws when user is not authenticated", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(null);
    await expect(getReadCredentials()).rejects.toThrow(/Unauthorized/);
    expect(getOryIdToken).not.toHaveBeenCalled();
  });

  test("returns STS credentials for authenticated user", async () => {
    (getPageSession as jest.Mock).mockResolvedValue({
      identity_id: "ory-123",
      account: { account_id: "user-1" },
    });
    (getOryIdToken as jest.Mock).mockResolvedValue("id-token-abc");
    fetchMock.mockResolvedValueOnce(
      new Response(STS_XML, { status: 200 }),
    );

    const creds = await getReadCredentials();

    expect(creds).toEqual({
      accessKeyId: "AKIAREAD",
      secretAccessKey: "readsecret",
      sessionToken: "readsess",
      expiration: "2026-04-10T13:00:00Z",
    });

    // Verify the STS call used the ID token
    const stsCall = fetchMock.mock.calls[0][0] as string;
    expect(stsCall).toContain("https://data.source.coop/.sts");
    expect(stsCall).toContain("Action=AssumeRoleWithWebIdentity");
    expect(stsCall).toContain("RoleArn=_default");
    expect(stsCall).toContain("WebIdentityToken=id-token-abc");
  });

  test("throws when STS returns non-200", async () => {
    (getPageSession as jest.Mock).mockResolvedValue({
      identity_id: "ory-123",
      account: { account_id: "user-1" },
    });
    (getOryIdToken as jest.Mock).mockResolvedValue("id-token");
    fetchMock.mockResolvedValueOnce(
      new Response("access denied", { status: 403 }),
    );

    await expect(getReadCredentials()).rejects.toThrow(/STS/);
  });
});
