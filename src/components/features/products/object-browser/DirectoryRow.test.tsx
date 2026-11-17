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
    deletions: [],
    deletePath: jest.fn(),
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
  it("shows the local date, with the full time and how long ago as its title", () => {
    const updated = new Date(Date.now() - 21 * 24 * 3600 * 1000);
    renderRow({
      name: "catalog.json",
      path: "catalog.json",
      size: 1234,
      updated_at: updated.toISOString(),
      isDirectory: false,
    });
    const cell = screen.getByTitle(/\(3 weeks ago\)$/);
    expect(cell).toHaveTextContent(
      updated.toLocaleDateString(undefined, { dateStyle: "medium" })
    );
    expect(cell.title).toContain(
      updated.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" })
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
    expect(screen.queryByTitle(/ago\)$/)).toBeNull();
  });

  it("puts copy behind a menu, leaving download as the one row action", () => {
    renderRow({
      name: "catalog.json",
      path: "catalog.json",
      size: 1234,
      updated_at: new Date().toISOString(),
      isDirectory: false,
    });
    expect(screen.getByRole("button", { name: /more actions/i })).toBeTruthy();
    expect(screen.queryByText("Copy URL")).toBeNull();
  });
});
