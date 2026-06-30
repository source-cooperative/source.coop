/** @jest-environment node */

// Mock component imports first
jest.mock("./loading", () => ({}));
jest.mock("@/components/features/metadata/ProductMetadata", () => {
  const { generateProductMetadata } = jest.requireActual(
    "@/components/features/metadata/ProductMetadata",
  );
  return { generateProductMetadata };
});
jest.mock("@/components/features/products/object-browser/DirectoryList", () => {
  return {
    DirectoryList: jest.fn(),
  };
});
jest.mock("@/components/features/products/object-browser/ObjectSummary", () => {
  return {
    ObjectSummary: jest.fn(),
  };
});
jest.mock("@/components/features/products/object-browser/ObjectPreview", () => {
  return {
    ObjectPreview: jest.fn(),
  };
});

jest.mock("@/lib", () => ({
  productsTable: {
    fetchById: jest.fn(),
  },
  getPageSession: jest.fn(),
  dataConnectionsTable: {
    fetchById: jest.fn(),
  },
  LOGGER: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  fileSourceUrl: jest.fn(),
  CONFIG: {
    google: {
      siteVerification: "test-verification",
    },
  },
}));

jest.mock("@/lib/services/proxy-credentials-read", () => ({
  readProxyCredentials: jest.fn(),
}));
jest.mock("@/lib/clients/storage", () => ({
  getStorageClient: jest.fn(),
}));
jest.mock("@/components/features/products/ProxyCredentialsGate", () => ({
  ProxyCredentialsGate: jest.fn(),
}));
jest.mock("@/components/features/products/ProductDataUnavailable", () => ({
  ProductDataUnavailable: jest.fn(),
}));

jest.mock("@/lib/api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

jest.mock("@/lib/baseUrl", () => ({
  getBaseUrl: jest.fn().mockResolvedValue("https://source.coop"),
}));

import ProductPathPage, { generateMetadata } from "./page";
import { productsTable, getPageSession } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import { getStorageClient } from "@/lib/clients/storage";
import { ProductDataUnavailable } from "@/components/features/products/ProductDataUnavailable";
import { DirectoryList } from "@/components/features/products/object-browser/DirectoryList";
import { ProxyCredentialsGate } from "@/components/features/products/ProxyCredentialsGate";
import { S3ServiceException } from "@aws-sdk/client-s3";
import { Actions } from "@/types/shared";

describe("Product Page Metadata", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns OpenGraph metadata for an authorized product", async () => {
    const mockProduct = {
      id: "test-product",
      product_id: "test-product",
      title: "Test Product",
      description: "A test product description",
      account: {
        account_id: "test-account",
        name: "Test Account",
      },
    };

    (productsTable.fetchById as jest.Mock).mockResolvedValue(mockProduct);
    (getPageSession as jest.Mock).mockResolvedValue(null);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    const metadata = await generateMetadata({
      params: Promise.resolve({
        account_id: "test-account",
        product_id: "test-product",
      }),
    });

    expect(metadata.title).toBe("Test Product · Test Account · Source Cooperative");
    expect(metadata.description).toBe("A test product description");

    // Test OpenGraph metadata
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toBe("Test Product · Test Account · Source Cooperative");
    expect(metadata.openGraph?.description).toBe("A test product description");
    expect(metadata.openGraph?.url).toBe("https://source.coop/test-account/test-product");

    // Test OpenGraph image
    expect(metadata.openGraph?.images).toBeDefined();
    expect(Array.isArray(metadata.openGraph?.images)).toBe(true);
    expect(metadata.openGraph?.images?.[0]).toMatchObject({
      url: "https://source.coop/api/og?type=product&account_id=test-account&product_id=test-product",
      width: 1200,
      height: 630,
    });

    // Test Twitter metadata
    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter?.title).toBe("Test Product · Test Account · Source Cooperative");
    expect(metadata.twitter?.description).toBe("A test product description");
    expect(metadata.twitter?.images).toContain("https://source.coop/api/og?type=product&account_id=test-account&product_id=test-product");
  });

  it("calls notFound when product is not found", async () => {
    const { notFound } = await import("next/navigation");

    (productsTable.fetchById as jest.Mock).mockResolvedValue(null);
    (getPageSession as jest.Mock).mockResolvedValue(null);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    await expect(
      generateMetadata({
        params: Promise.resolve({
          account_id: "missing-account",
          product_id: "missing-product",
        }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });

});

describe("ProductPathPage proxy AccessDenied handling", () => {
  const accessDenied = () =>
    new S3ServiceException({
      name: "AccessDenied",
      $fault: "client",
      $metadata: { httpStatusCode: 403 },
    });

  const mockProduct = (visibility: "public" | "restricted") => ({
    product_id: "test-product",
    visibility,
    metadata: {
      primary_mirror: "primary",
      mirrors: { primary: { connection_id: "dc-1" } },
    },
    account: { account_id: "test-account", name: "Test Account" },
  });

  const renderPage = () =>
    ProductPathPage({
      params: Promise.resolve({
        account_id: "test-account",
        product_id: "test-product",
        path: [],
      }),
    });

  beforeEach(() => {
    (getPageSession as jest.Mock).mockResolvedValue({ identity_id: "user-1" });
    (isAuthorized as jest.Mock).mockReturnValue(true);
    // Credentials are present so the render proceeds past the gate to the
    // proxy read itself.
    (readProxyCredentials as jest.Mock).mockResolvedValue({
      accessKeyId: "A",
      secretAccessKey: "S",
      sessionToken: "T",
      expiration: new Date(Date.now() + 3_600_000).toISOString(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows ProductDataUnavailable when the proxy denies a signed read on a restricted product", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      mockProduct("restricted"),
    );
    (getStorageClient as jest.Mock).mockResolvedValue({
      listObjects: jest.fn().mockRejectedValue(accessDenied()),
      getObjectInfo: jest.fn(),
    });

    const element = await renderPage();
    expect(element.type).toBe(ProductDataUnavailable);
  });

  it("degrades to ProductDataUnavailable when a public product's read is denied", async () => {
    // An anonymous read of a public product denied by a proxy misconfiguration
    // must not blank the whole product — degrade in place so the header and Edit
    // link (where an owner fixes the connection) stay reachable.
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      mockProduct("public"),
    );
    (getStorageClient as jest.Mock).mockResolvedValue({
      listObjects: jest.fn().mockRejectedValue(accessDenied()),
      getObjectInfo: jest.fn(),
    });

    const element = await renderPage();
    expect(element.type).toBe(ProductDataUnavailable);
  });

  it("degrades to ProductDataUnavailable when the listing fails to deserialize (proxy hang)", async () => {
    // The reported bug: the proxy hangs, Cloudflare returns a non-XML body, and
    // the AWS SDK throws a deserialization error (not an S3ServiceException).
    // Must degrade in place, not throw to the route error boundary.
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      mockProduct("restricted"),
    );
    (getStorageClient as jest.Mock).mockResolvedValue({
      listObjects: jest
        .fn()
        .mockRejectedValue(new Error("char 'e' is not expected.:1:1")),
      getObjectInfo: jest.fn(),
    });

    const element = await renderPage();
    expect(element.type).toBe(ProductDataUnavailable);
  });

  it("degrades to ProductDataUnavailable on a proxy ServiceUnavailable (503) wrapping a backend 403", async () => {
    // Production shape: the proxy's assumed role can't list the backend bucket,
    // so S3 returns 403; the proxy re-wraps it as a 503 ServiceUnavailable (Code
    // "ServiceUnavailable", httpStatusCode 503 — not 403, so isAccessDeniedError
    // is false). Must degrade in place, never reach the route error boundary.
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      mockProduct("restricted"),
    );
    (getStorageClient as jest.Mock).mockResolvedValue({
      listObjects: jest.fn().mockRejectedValue(
        new S3ServiceException({
          name: "ServiceUnavailable",
          $fault: "client",
          $metadata: { httpStatusCode: 503 },
        }),
      ),
      getObjectInfo: jest.fn(),
    });

    const element = await renderPage();
    expect(element.type).toBe(ProductDataUnavailable);
  });

  it("surfaces raw error details to a maintainer (can edit the product)", async () => {
    // Anyone authorized to edit the product (Actions.PutRepository — the same
    // gate as the Edit button) sees the underlying failure to debug a broken
    // data connection. isAuthorized is true for all actions here (beforeEach).
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      mockProduct("restricted"),
    );
    (getStorageClient as jest.Mock).mockResolvedValue({
      listObjects: jest.fn().mockRejectedValue(
        new S3ServiceException({
          name: "ServiceUnavailable",
          message: "backend error: ...403 Forbidden...",
          $fault: "client",
          $metadata: { httpStatusCode: 503 },
        }),
      ),
      getObjectInfo: jest.fn(),
    });

    const element = await renderPage();
    expect(element.type).toBe(ProductDataUnavailable);
    expect(element.props.details).toContain("backend error");
  });

  it("hides error details from a non-maintainer (cannot edit the product)", async () => {
    // A viewer who can read but not edit (PutRepository denied) gets the notice
    // but never the raw error — gated server-side, so details is undefined and
    // the internals are never sent to their browser.
    (isAuthorized as jest.Mock).mockImplementation(
      (_session, _product, action) => action !== Actions.PutRepository,
    );
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      mockProduct("restricted"),
    );
    (getStorageClient as jest.Mock).mockResolvedValue({
      listObjects: jest.fn().mockRejectedValue(
        new S3ServiceException({
          name: "ServiceUnavailable",
          message: "backend error: ...403 Forbidden...",
          $fault: "client",
          $metadata: { httpStatusCode: 503 },
        }),
      ),
      getObjectInfo: jest.fn(),
    });

    const element = await renderPage();
    expect(element.type).toBe(ProductDataUnavailable);
    expect(element.props.details).toBeUndefined();
  });

  it("falls through to the directory listing when the file HEAD is denied", async () => {
    // First visit to a restricted file URL: the HEAD is unsigned and denied;
    // the page must keep rendering (gate / listing), not crash.
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      mockProduct("restricted"),
    );
    (getStorageClient as jest.Mock).mockResolvedValue({
      getObjectInfo: jest.fn().mockRejectedValue(accessDenied()),
      listObjects: jest.fn().mockResolvedValue({
        objects: [],
        directories: [],
        isTruncated: false,
      }),
    });

    const element = await ProductPathPage({
      params: Promise.resolve({
        account_id: "test-account",
        product_id: "test-product",
        path: ["file.txt"],
      }),
    });
    expect(element.type).toBe(DirectoryList);
  });

  it("degrades to ProductDataUnavailable on a non-AccessDenied HEAD failure", async () => {
    // A backend failure on the file-detection HEAD must keep the product
    // rendering (degraded), not crash the whole page.
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      mockProduct("restricted"),
    );
    (getStorageClient as jest.Mock).mockResolvedValue({
      getObjectInfo: jest.fn().mockRejectedValue(new Error("proxy exploded")),
      listObjects: jest.fn(),
    });

    const element = await ProductPathPage({
      params: Promise.resolve({
        account_id: "test-account",
        product_id: "test-product",
        path: ["file.txt"],
      }),
    });
    expect(element.type).toBe(ProductDataUnavailable);
  });
});

describe("ProductPathPage authenticated-read gate for deactivated products", () => {
  beforeEach(() => {
    (getPageSession as jest.Mock).mockResolvedValue({ identity_id: "admin-1" });
    (isAuthorized as jest.Mock).mockReturnValue(true);
    // No cached proxy credentials — anonymous client.
    (readProxyCredentials as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("routes a deactivated product through ProxyCredentialsGate regardless of visibility", async () => {
    // A disabled product is reachable only by its owners/maintainers and
    // admins, and the proxy won't serve its data anonymously — even a *public*
    // disabled product must mint signed credentials rather than attempt an
    // anonymous read.
    (productsTable.fetchById as jest.Mock).mockResolvedValue({
      product_id: "test-product",
      visibility: "public",
      disabled: true,
      metadata: { primary_mirror: "primary", mirrors: {} },
      account: { account_id: "test-account", name: "Test Account" },
    });
    const listObjects = jest.fn();
    (getStorageClient as jest.Mock).mockResolvedValue({
      listObjects,
      getObjectInfo: jest.fn(),
    });

    const element = await ProductPathPage({
      params: Promise.resolve({
        account_id: "test-account",
        product_id: "test-product",
        path: [],
      }),
    });

    expect(element.type).toBe(ProxyCredentialsGate);
    // Never attempted an anonymous listing.
    expect(listObjects).not.toHaveBeenCalled();
  });
});

describe("Product Page Metadata (authorization)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls notFound (no metadata leak) when the viewer is not authorized", async () => {
    const { notFound } = await import("next/navigation");

    // A restricted product the viewer may not read: it exists, but isAuthorized
    // returns false. generateMetadata must 404 rather than expose its metadata.
    (productsTable.fetchById as jest.Mock).mockResolvedValue({
      id: "secret-product",
      product_id: "secret-product",
      title: "Secret Product",
      description: "Should not leak",
      visibility: "restricted",
      account: { account_id: "secret-account", name: "Secret" },
    });
    (getPageSession as jest.Mock).mockResolvedValue(null);
    (isAuthorized as jest.Mock).mockReturnValue(false);

    await expect(
      generateMetadata({
        params: Promise.resolve({
          account_id: "secret-account",
          product_id: "secret-product",
        }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });
});
