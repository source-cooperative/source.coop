import { NextRequest } from "next/server";
import { LOGGER, accountUrl, productUrl } from "@/lib";
import {
  OpenGraphImage,
  ogImageSize,
  ogImageContentType,
} from "@/components/og/OpenGraphImage";
import { accountsTable, productsTable } from "@/lib/clients/database";
import { AccountType } from "@/types/account";
import { getProfileImage } from "@/lib/api/utils";

export const runtime = "edge";

/**
 * OpenGraph Image Generator
 *
 * Account
 * /api/og?type=account&account_id=cholmes
 *
 * Product
 * /api/og?type=product&account_id=cholmes&product_id=landsat
 *
 * File
 * /api/og?type=file&account_id=cholmes&product_id=landsat&path=data/scene.tif
 *
 * Custom
 * /api/og?title=My Title&subtitle=Description&footer=Context
 *
 * @param req
 * @returns
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type");
    const accountId = searchParams.get("account_id");
    const productId = searchParams.get("product_id");
    const path = searchParams.get("path");

    switch (type) {
      case "account":
        if (!accountId) {
          return new Response("Missing account_id parameter", {
            status: 400,
          });
        }
        return generateAccountImage(accountId);

      case "product":
        if (!accountId || !productId) {
          return new Response("Missing account_id or product_id parameter", {
            status: 400,
          });
        }
        return generateProductImage(accountId, productId);

      case "file":
        if (!accountId || !productId || !path) {
          return new Response(
            "Missing account_id, product_id, or path parameter",
            { status: 400 }
          );
        }
        return generateFileImage(accountId, productId, path);

      default: {
        // Try custom parameters
        const customImage = generateCustomImage(searchParams);
        if (customImage) {
          return customImage;
        }

        // Return default
        return generateDefaultImage();
      }
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    LOGGER.error("Failed to generate image", {
      operation: "og.GET",
      context: "image generation",
      error: e,
    });
    return new Response(`Failed to generate image: ${errorMessage}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

/**
 * Generate OpenGraph image for an account
 */
async function generateAccountImage(accountId: string) {
  const account = await accountsTable.fetchById(accountId);

  if (!account) {
    return OpenGraphImage({
      title: "Account Not Found",
    });
  }

  const accountName = account.name;
  const bio = account.metadata_public.bio;
  const accountTypeLabel =
    account.type === AccountType.INDIVIDUAL ? "Individual" : "Organization";

  // Get avatar URL from Gravatar
  let avatarUrl: string | undefined;
  if (account.type === AccountType.INDIVIDUAL) {
    const primaryEmail = account.emails?.find((e) => e.is_primary)?.address;
    if (primaryEmail) {
      avatarUrl = `${getProfileImage(primaryEmail)}?d=identicon&s=200`;
    }
  }

  return OpenGraphImage({
    title: accountName,
    subtitle: bio,
    footer: accountTypeLabel,
    avatarUrl,
    url: accountUrl(accountId),
  });
}

/**
 * Generate OpenGraph image for a product
 */
async function generateProductImage(accountId: string, productId: string) {
  const product = await productsTable.fetchById(accountId, productId);

  if (!product) {
    return OpenGraphImage({
      title: "Product Not Found",
    });
  }

  return OpenGraphImage({
    title: product.title,
    subtitle: product.description,
    footer: `by ${product.account?.name || accountId}`,
    url: productUrl(accountId, productId),
  });
}

/**
 * Generate OpenGraph image for a file
 */
async function generateFileImage(
  accountId: string,
  productId: string,
  path: string
) {
  const product = await productsTable.fetchById(accountId, productId);

  if (!product) {
    return OpenGraphImage({
      title: "Product Not Found",
    });
  }

  // Extract file name from path
  const fileName = path.split("/").pop() || path;

  return OpenGraphImage({
    title: fileName,
    subtitle: product.title,
    footer: `in ${accountId}/${productId}`,
    url: `${accountId}/${productId}/${path}`,
  });
}

/**
 * Generate OpenGraph image with custom parameters
 */
function generateCustomImage(searchParams: URLSearchParams) {
  const title = searchParams.get("title");
  const subtitle = searchParams.get("subtitle");
  const footer = searchParams.get("footer");
  const url = searchParams.get("url");

  if (!title) {
    return null;
  }

  return OpenGraphImage({
    title,
    subtitle: subtitle || undefined,
    footer: footer || undefined,
    url: url || undefined,
  });
}

/**
 * Generate default OpenGraph image
 */
function generateDefaultImage() {
  return OpenGraphImage({
    title: "Source Cooperative",
    subtitle: "Geospatial Data Repository",
  });
}
