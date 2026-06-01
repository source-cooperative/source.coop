import { render, screen, act } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
  usePathname: () => "/acct/prod",
}));

const mockRefreshCreds = jest.fn();
jest.mock("@/lib/services/proxy-credentials-cache", () => ({
  refreshProxyCredentials: () => mockRefreshCreds(),
}));

import { ProxyCredentialsGate } from "./ProxyCredentialsGate";

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("ProxyCredentialsGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  // Regression: when the mint reports success but the credentials never become
  // available (e.g. the cookie can't be read), router.refresh() keeps rendering
  // the gate. router.refresh() preserves this client instance, so the mount
  // effect never re-fires — without the post-refresh recheck the gate would
  // spin forever. It must re-attempt and then surface the error.
  test("surfaces an error instead of hanging when refresh keeps returning the gate", async () => {
    mockRefreshCreds.mockResolvedValue({ ok: true, minted: true });

    render(
      <Theme>
        <ProxyCredentialsGate />
      </Theme>,
    );

    // Initial attempt: mint + refresh.
    await flush();
    expect(mockRefreshCreds).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Still mounted after the recheck delay → re-attempt (2nd).
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await flush();
    expect(mockRefreshCreds).toHaveBeenCalledTimes(2);

    // Next recheck pushes the quick-attempt count past the cap → error, and no
    // further refresh is issued.
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await flush();
    expect(
      screen.getByText(/couldn't load your access credentials/i),
    ).toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });

  test("does not re-attempt after the gate unmounts (refresh resolved it)", async () => {
    mockRefreshCreds.mockResolvedValue({ ok: true, minted: true });

    const { unmount } = render(
      <Theme>
        <ProxyCredentialsGate />
      </Theme>,
    );
    await flush();
    expect(mockRefreshCreds).toHaveBeenCalledTimes(1);

    // Simulate the success case: the server re-render replaced the gate.
    unmount();
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    // The pending recheck timer was cleared on unmount — no extra attempt.
    expect(mockRefreshCreds).toHaveBeenCalledTimes(1);
  });
});
