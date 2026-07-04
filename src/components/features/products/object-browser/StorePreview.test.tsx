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

import { StorePreview } from "./StorePreview";
import { PreviewIframe } from "./PreviewIframe";
import { getStorageClient } from "@/lib/clients/storage";
import { probeStore } from "@/lib/stores/probe";

const props = {
  account_id: "bkr",
  product_id: "gfs",
  object_path: "gfs.icechunk",
  extension: "icechunk",
};

describe("StorePreview", () => {
  beforeEach(() => {
    (getStorageClient as jest.Mock).mockResolvedValue({});
    jest.clearAllMocks();
  });

  it("renders the zarr-viewer iframe with the encoded source URL when renderable", async () => {
    (getStorageClient as jest.Mock).mockResolvedValue({});
    (probeStore as jest.Mock).mockResolvedValue({ renderable: true, format: "icechunk" });

    const element = await StorePreview(props);

    expect(element).not.toBeNull();
    expect(element!.type).toBe(PreviewIframe);
    expect(element!.props.src).toBe(
      "https://source-cooperative.github.io/zarr-viewer/?url=" +
        encodeURIComponent("https://data.source.coop/bkr/gfs/gfs.icechunk"),
    );
  });

  it("renders nothing when the store isn't renderable", async () => {
    (getStorageClient as jest.Mock).mockResolvedValue({});
    (probeStore as jest.Mock).mockResolvedValue({ renderable: false, reason: "no metadata" });

    const element = await StorePreview(props);

    expect(element).toBeNull();
  });
});
