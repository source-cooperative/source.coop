import { act, renderHook } from "@testing-library/react";
import {
  S3CredentialsProvider,
  useS3Credentials,
} from "../CredentialsProvider";
import { getTemporaryCredentials } from "@/lib/actions/credentials";

jest.mock("@/lib/actions/credentials", () => ({
  getTemporaryCredentials: jest.fn(),
}));

const scope = { accountId: "acc", productId: "p" };
const credsExpiringIn = (ms: number) => ({
  accessKeyId: "AK",
  secretAccessKey: "SK",
  sessionToken: "ST",
  expiration: new Date(Date.now() + ms).toISOString(),
  endpoint: "https://data.source.coop",
  bucket: "acc",
  region: "us-east-1",
  prefix: "p/",
});

const renderCredentials = () =>
  renderHook(() => useS3Credentials(), { wrapper: S3CredentialsProvider });

beforeEach(() => jest.clearAllMocks());

describe("S3CredentialsProvider", () => {
  it("mints once for a prefetch, the click after it, and a later re-enable", async () => {
    (getTemporaryCredentials as jest.Mock).mockResolvedValue(
      credsExpiringIn(60 * 60 * 1000),
    );
    const { result } = renderCredentials();

    act(() => result.current.prefetchCredentials(scope));
    expect(result.current.getCredentials(scope)).toBeUndefined();

    await act(() => result.current.fetchCredentials(scope));
    expect(result.current.getCredentials(scope)?.accessKeyId).toBe("AK");

    act(() => result.current.clearCredentials(scope));
    expect(result.current.getCredentials(scope)).toBeUndefined();

    await act(() => result.current.fetchCredentials(scope));
    expect(result.current.getCredentials(scope)?.accessKeyId).toBe("AK");
    expect(getTemporaryCredentials).toHaveBeenCalledTimes(1);
  });

  it("mints again when the cached credentials are close to expiry", async () => {
    (getTemporaryCredentials as jest.Mock).mockResolvedValue(
      credsExpiringIn(10 * 60 * 1000),
    );
    const { result } = renderCredentials();

    await act(() => result.current.fetchCredentials(scope));
    act(() => result.current.clearCredentials(scope));
    await act(() => result.current.fetchCredentials(scope));
    expect(getTemporaryCredentials).toHaveBeenCalledTimes(2);
  });

  it("serves the upload SDK from the cache, and forgets it on clearAllCredentials", async () => {
    (getTemporaryCredentials as jest.Mock).mockResolvedValue(
      credsExpiringIn(60 * 60 * 1000),
    );
    const { result } = renderCredentials();

    await act(() => result.current.fetchCredentials(scope));
    await act(async () => void (await result.current.loadCredentials(scope)));
    expect(getTemporaryCredentials).toHaveBeenCalledTimes(1);

    act(() => result.current.clearAllCredentials());
    await act(async () => void (await result.current.loadCredentials(scope)));
    expect(getTemporaryCredentials).toHaveBeenCalledTimes(2);
  });

  it("retries on click after a failed prefetch", async () => {
    (getTemporaryCredentials as jest.Mock)
      .mockRejectedValueOnce(new Error("mint failed"))
      .mockResolvedValue(credsExpiringIn(60 * 60 * 1000));
    const { result } = renderCredentials();

    await act(async () => result.current.prefetchCredentials(scope));
    await act(() => result.current.fetchCredentials(scope));
    expect(result.current.getStatus(scope)).toBe("success");
    expect(getTemporaryCredentials).toHaveBeenCalledTimes(2);
  });
});
