import { render, screen, waitFor, act } from "@testing-library/react";

const mockGetReadCredentials = jest.fn();
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
  getReadCredentials: (...args: unknown[]) =>
    mockGetReadCredentials(...args),
}));

import {
  S3CredentialsProvider,
  useS3Credentials,
} from "./CredentialsProvider";

function ReadCredentialsConsumer() {
  const { readCredentials, readCredentialsStatus } = useS3Credentials();
  return (
    <div>
      <span data-testid="status">{readCredentialsStatus ?? "undefined"}</span>
      <span data-testid="accessKeyId">
        {readCredentials?.accessKeyId ?? "none"}
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
    mockGetReadCredentials.mockResolvedValue({
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
    expect(mockGetReadCredentials).toHaveBeenCalledTimes(1);
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
    expect(mockGetReadCredentials).not.toHaveBeenCalled();
  });

  it("sets status to 'failed' when fetch throws", async () => {
    mockGetReadCredentials.mockRejectedValue(new Error("Unauthorized"));

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
