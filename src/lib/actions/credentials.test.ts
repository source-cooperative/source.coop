/** @jest-environment node */

jest.mock("@/lib", () => ({
  CONFIG: {
    storage: { endpoint: "https://data.source.coop", region: "us-east-1" },
  },
  LOGGER: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  productsTable: { fetchById: jest.fn() },
}));

jest.mock("@/lib/api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));
jest.mock("@/lib/actions/proxy-credentials", () => ({
  getProxyCredentials: jest.fn(),
}));
jest.mock("@/lib/services/proxy-credentials-read", () => ({
  readProxyCredentials: jest.fn(),
}));

import { getTemporaryCredentials } from "./credentials";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { productsTable } from "@/lib";
import { getProxyCredentials } from "@/lib/actions/proxy-credentials";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";

const CREDS = {
  accessKeyId: "AKIA",
  secretAccessKey: "secret",
  sessionToken: "token",
  expiration: "2099-01-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  (getPageSession as jest.Mock).mockResolvedValue({
    account: { account_id: "acc" },
    identity_id: "id-1",
  });
  (productsTable.fetchById as jest.Mock).mockResolvedValue({
    product_id: "p",
    account_id: "acc",
  });
  (isAuthorized as jest.Mock).mockReturnValue(true);
  (readProxyCredentials as jest.Mock).mockResolvedValue(undefined);
  (getProxyCredentials as jest.Mock).mockResolvedValue(CREDS);
});

describe("getTemporaryCredentials", () => {
  it("mints with the verified identity and shapes creds to the proxy path", async () => {
    const out = await getTemporaryCredentials({
      accountId: "acc",
      productId: "p",
    });
    // Minted from the verified session identity — never from request input.
    expect(getProxyCredentials).toHaveBeenCalledWith("id-1");
    expect(out).toEqual({
      ...CREDS,
      endpoint: "https://data.source.coop",
      bucket: "acc",
      region: "us-east-1",
      prefix: "p/",
    });
  });

  it("reuses the cached cookie when fresh, without minting", async () => {
    (readProxyCredentials as jest.Mock).mockResolvedValue(CREDS);
    await getTemporaryCredentials({ accountId: "acc", productId: "p" });
    expect(getProxyCredentials).not.toHaveBeenCalled();
  });

  it("rejects an uploader without write permission", async () => {
    (isAuthorized as jest.Mock).mockReturnValue(false);
    await expect(
      getTemporaryCredentials({ accountId: "acc", productId: "p" }),
    ).rejects.toThrow(/permission to upload/);
  });

  it("rejects when there is no session", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(null);
    await expect(
      getTemporaryCredentials({ accountId: "acc", productId: "p" }),
    ).rejects.toThrow(/No valid session/);
  });
});
