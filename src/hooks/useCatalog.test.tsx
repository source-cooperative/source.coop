import { renderHook, waitFor } from "@testing-library/react";
import { loadCatalog, peekCatalog } from "@/lib/catalog";
import { useCatalog } from "./useCatalog";

jest.mock("@/lib/catalog", () => ({ loadCatalog: jest.fn(), peekCatalog: jest.fn() }));
const load = jest.mocked(loadCatalog);
const peek = jest.mocked(peekCatalog);

beforeEach(() => {
  load.mockReset();
  peek.mockReset();
});

it("does not fetch until enabled", async () => {
  const entries = new Map();
  load.mockResolvedValue(entries);
  const { result, rerender } = renderHook(({ enabled }) => useCatalog(enabled), { initialProps: { enabled: false } });
  expect(load).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await waitFor(() => expect(result.current).toBe(entries));
  rerender({ enabled: false });
  expect(result.current).toBeUndefined();
});

it("leaves metadata absent on network failure", async () => {
  load.mockRejectedValue(new Error("Offline"));
  const { result } = renderHook(() => useCatalog(true));
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  expect(result.current).toBeUndefined();
});

it("starts from an already-loaded catalog, so a remount never renders empty", () => {
  const entries = new Map();
  peek.mockReturnValue(entries);
  load.mockReturnValue(new Promise(() => {}));
  const { result } = renderHook(() => useCatalog(true));
  expect(result.current).toBe(entries);
});
