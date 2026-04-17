import { render, screen, waitFor, act } from "@testing-library/react";

const mockGetProxyCredentials = jest.fn();
const mockGetTemporaryCredentials = jest.fn();

jest.mock("@/lib", () => ({
  LOGGER: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getTemporaryCredentials: (...args: unknown[]) =>
    mockGetTemporaryCredentials(...args),
}));

jest.mock("@/lib/actions/proxy-credentials", () => ({
  getProxyCredentials: (...args: unknown[]) =>
    mockGetProxyCredentials(...args),
}));

import {
  S3CredentialsProvider,
  useS3Credentials,
} from "./CredentialsProvider";

function ReadCredentialsConsumer() {
  const { proxyCredentials, proxyCredentialsStatus } = useS3Credentials();
  return (
    <div>
      <span data-testid="status">{proxyCredentialsStatus ?? "undefined"}</span>
      <span data-testid="accessKeyId">
        {proxyCredentials?.accessKeyId ?? "none"}
      </span>
    </div>
  );
}

describe("S3CredentialsProvider - read credentials", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("fetches read credentials on mount when isAuthenticated is true", async () => {
    mockGetProxyCredentials.mockResolvedValue({
      accessKeyId: "AKID",
      secretAccessKey: "SECRET",
      sessionToken: "TOKEN",
      expiration: new Date(Date.now() + 3600_000).toISOString(),
    });

    await act(async () => {
      render(
        <S3CredentialsProvider isAuthenticated={true}>
          <ReadCredentialsConsumer />
        </S3CredentialsProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("success");
    });

    expect(screen.getByTestId("accessKeyId").textContent).toBe("AKID");
    expect(mockGetProxyCredentials).toHaveBeenCalledTimes(1);
  });

  it("does NOT fetch when isAuthenticated is false", async () => {
    await act(async () => {
      render(
        <S3CredentialsProvider isAuthenticated={false}>
          <ReadCredentialsConsumer />
        </S3CredentialsProvider>
      );
    });

    expect(screen.getByTestId("status").textContent).toBe("undefined");
    expect(screen.getByTestId("accessKeyId").textContent).toBe("none");
    expect(mockGetProxyCredentials).not.toHaveBeenCalled();
  });

  it("sets status to 'failed' when fetch throws", async () => {
    mockGetProxyCredentials.mockRejectedValue(new Error("Unauthorized"));

    await act(async () => {
      render(
        <S3CredentialsProvider isAuthenticated={true}>
          <ReadCredentialsConsumer />
        </S3CredentialsProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("failed");
    });

    expect(screen.getByTestId("accessKeyId").textContent).toBe("none");
  });
});
