/** @jest-environment node */

jest.mock("@radix-ui/themes", () => ({ Card: jest.fn() }));
jest.mock("@/components/features/products/object-browser/ObjectPreview", () => ({
  ObjectPreview: jest.fn(),
}));
jest.mock("@/components/features/products/object-browser/PreviewIframe", () => ({
  PreviewIframe: jest.fn(),
}));
jest.mock("@/components/features/products/object-browser/ObjectPreviewCard", () => ({
  ObjectPreviewCard: jest.fn(),
}));
jest.mock("@/components/features/products/object-browser/ObjectPreviewExternal", () => ({
  getIframeSrc: jest.fn(),
  fileTypeLabel: jest.fn(),
}));
jest.mock("@/components/features/products/object-browser/storeViewer", () => ({
  storeViewerUrl: jest.fn(),
  storeLabelFromResult: jest.fn(),
}));
jest.mock("@/lib/services/proxy-credentials-read", () => ({
  readProxyCredentials: jest.fn(),
}));
jest.mock("@/lib/clients/storage", () => ({
  getStorageClient: jest.fn(),
}));
jest.mock("@/lib/urls", () => ({
  fileSourceUrl: jest.fn(),
}));
jest.mock("../data", () => ({
  getAuthorizedProduct: jest.fn(),
}));

import ObjectPreviewSlot from "./page";
import { storeViewerUrl } from "@/components/features/products/object-browser/storeViewer";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import { getStorageClient } from "@/lib/clients/storage";
import { getAuthorizedProduct } from "../data";

const render = (path?: string[]) =>
  ObjectPreviewSlot({
    params: Promise.resolve({ account_id: "acct", product_id: "prod", path }),
  });

/** A storage client where `object_path` HEADs miss and `prefix` lists `listing`. */
function storageWith(listing: { objects: string[]; directories: string[] }) {
  const s3 = {
    getObjectInfo: jest.fn().mockResolvedValue(null),
    listObjects: jest.fn(async ({ prefix }: { prefix: string }) => ({
      objects: listing.objects.map((name) => ({ key: `${prefix}${name}` })),
      directories: listing.directories.map((name) => `${prefix}${name}/`),
      isTruncated: false,
    })),
  };
  (getStorageClient as jest.Mock).mockResolvedValue(s3);
  return s3;
}

const icechunkRoot = {
  objects: ["repo"],
  directories: ["chunks", "manifests", "refs", "snapshots", "transactions"],
};

describe("ObjectPreviewSlot store detection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthorizedProduct as jest.Mock).mockResolvedValue({ visibility: "public" });
    (readProxyCredentials as jest.Mock).mockResolvedValue(null);
    (storeViewerUrl as jest.Mock).mockResolvedValue({
      url: "https://viewer",
      format: "icechunk",
      icechunkVersion: 2,
    });
  });

  it("probes an Icechunk repo at the product root", async () => {
    const s3 = storageWith(icechunkRoot);
    expect(await render()).not.toBeNull();
    expect(s3.listObjects).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "acct", prefix: "prod/" }),
    );
    expect(storeViewerUrl).toHaveBeenCalledWith(
      expect.objectContaining({ object_path: "", extension: "icechunk" }),
    );
  });

  it("probes a nested directory without a store extension", async () => {
    const s3 = storageWith({ objects: ["zarr.json"], directories: ["temp"] });
    expect(await render(["data", "era5", ""])).not.toBeNull();
    expect(s3.listObjects).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: "prod/data/era5/" }),
    );
    expect(storeViewerUrl).toHaveBeenCalledWith(
      expect.objectContaining({ object_path: "data/era5", extension: "zarr" }),
    );
  });

  it("renders nothing for a directory without store markers", async () => {
    storageWith({ objects: ["a.tif"], directories: ["era5.zarr"] });
    expect(await render(["data"])).toBeNull();
    expect(storeViewerUrl).not.toHaveBeenCalled();
  });

  it("renders nothing when the markers match but the probe rejects the store", async () => {
    storageWith(icechunkRoot);
    (storeViewerUrl as jest.Mock).mockResolvedValue(null);
    expect(await render(["data"])).toBeNull();
  });

  it("probes a store-extension path without listing it", async () => {
    const s3 = storageWith({ objects: [], directories: [] });
    await render(["gfs.icechunk"]);
    expect(s3.listObjects).not.toHaveBeenCalled();
    expect(storeViewerUrl).toHaveBeenCalledWith(
      expect.objectContaining({ object_path: "gfs.icechunk", extension: "icechunk" }),
    );
  });

  it("renders nothing when the listing fails", async () => {
    const s3 = storageWith(icechunkRoot);
    s3.listObjects.mockRejectedValue(new Error("proxy down"));
    expect(await render(["data"])).toBeNull();
    expect(storeViewerUrl).not.toHaveBeenCalled();
  });
});
