import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { DirectoryRow } from "./DirectoryRow";
import type { Product } from "@/types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));
jest.mock("@/components/features/uploader", () => ({
  useUploadManager: () => ({
    cancelUpload: jest.fn(),
    retryUpload: jest.fn(),
    getUploadsForScope: () => [],
    deleteObject: jest.fn(),
    deletePrefix: jest.fn(),
  }),
  useS3Credentials: () => ({ getCredentials: () => null }),
}));

const product = {
  account_id: "cholmes",
  product_id: "overture",
} as Product;

const renderRow = (item: Parameters<typeof DirectoryRow>[0]["item"]) =>
  render(
    <Theme>
      <DirectoryRow
        item={item}
        index={0}
        itemsLength={1}
        itemHeight={40}
        product={product}
      />
    </Theme>
  );

describe("DirectoryRow last modified", () => {
  it("shows a relative time with the UTC timestamp as its title", () => {
    renderRow({
      name: "catalog.json",
      path: "catalog.json",
      size: 1234,
      updated_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString(),
      isDirectory: false,
    });
    expect(screen.getByText("3 weeks ago")).toHaveAttribute(
      "title",
      expect.stringContaining("UTC")
    );
  });

  it("omits it for directories, whose mtime is synthetic", () => {
    renderRow({
      name: "tiles",
      path: "tiles/",
      size: 0,
      updated_at: new Date().toISOString(),
      isDirectory: true,
    });
    expect(screen.queryByText(/ago$/)).toBeNull();
  });
});
