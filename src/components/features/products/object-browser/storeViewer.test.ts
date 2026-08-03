/** @jest-environment node */

jest.mock("@/lib/clients/storage", () => ({ getStorageClient: jest.fn() }));
jest.mock("@/lib/stores/probe", () => ({ probeStore: jest.fn() }));
jest.mock("@/lib", () => ({ LOGGER: { debug: jest.fn() } }));
jest.mock("@/lib/urls", () => ({
  fileSourceUrl: ({
    account_id,
    product_id,
    object_path,
  }: {
    account_id: string;
    product_id: string;
    object_path: string;
  }) => `https://data.source.coop/${account_id}/${product_id}/${object_path}`,
}));

import { storeViewerUrl } from "./storeViewer";
import { getStorageClient } from "@/lib/clients/storage";
import { probeStore } from "@/lib/stores/probe";

const creds = {
  accessKeyId: "A",
  secretAccessKey: "S",
  sessionToken: "T",
  expiration: "2099-01-01T00:00:00.000Z",
};

const args = {
  account_id: "bkr",
  product_id: "gfs",
  object_path: "gfs.icechunk",
  extension: "icechunk",
  creds,
} as Parameters<typeof storeViewerUrl>[0];

describe("storeViewerUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getStorageClient as jest.Mock).mockResolvedValue({});
  });

  it("returns the zarr-viewer URL with the encoded source URL when renderable", async () => {
    (probeStore as jest.Mock).mockResolvedValue({
      renderable: true,
      format: "icechunk",
    });

    await expect(storeViewerUrl(args)).resolves.toBe(
      "https://source-cooperative.github.io/zarr-viewer/?url=" +
        encodeURIComponent("https://data.source.coop/bkr/gfs/gfs.icechunk"),
    );
    // Reuses the request's already-resolved creds instead of re-reading the cookie.
    expect(getStorageClient).toHaveBeenCalledWith(creds);
  });

  it("returns null when the store isn't renderable", async () => {
    (probeStore as jest.Mock).mockResolvedValue({
      renderable: false,
      reason: "no metadata",
    });

    await expect(storeViewerUrl(args)).resolves.toBeNull();
  });
});
