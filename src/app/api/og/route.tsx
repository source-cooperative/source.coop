import { NextRequest } from "next/server";
import { LOGGER, accountUrl, productUrl } from "@/lib";
import { getBaseUrl } from "@/lib/baseUrl";
import { OpenGraphImage } from "@/components/og/OpenGraphImage";
import { OGAvatar } from "@/components/og/OGAvatar";
import { accountsTable, productsTable } from "@/lib/clients/database";
import { AccountType } from "@/types/account";

/**
 * OpenGraph Image Generator
 *
 * Account
 * /api/og?type=account&account_id=cholmes
 *
 * Product
 * /api/og?type=product&account_id=cholmes&product_id=landsat
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

    // Extract host from request headers
    const host = new URL(await getBaseUrl()).host;

    switch (type) {
      case "account":
        if (!accountId) {
          return new Response("Missing account_id parameter", {
            status: 400,
          });
        }
        return generateAccountImage(accountId, host);

      case "product":
        if (!accountId || !productId) {
          return new Response("Missing account_id or product_id parameter", {
            status: 400,
          });
        }
        return generateProductImage(accountId, productId, host);

      default: {
        // Try custom parameters
        const customImage = generateCustomImage(searchParams, host);
        if (customImage) {
          return customImage;
        }

        // Return default
        return generateDefaultImage(host);
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
async function generateAccountImage(accountId: string, host: string) {
  const account = await accountsTable.fetchById(accountId);

  if (!account) {
    return OpenGraphImage({
      title: "Account Not Found",
      host,
    });
  }

  const accountName = account.name;
  const bio = account.metadata_public.bio;
  const accountTypeLabel =
    account.type === AccountType.INDIVIDUAL ? "Individual" : "Organization";

  return OpenGraphImage({
    title: accountName,
    subtitle: bio,
    footer: accountTypeLabel,
    avatar: <OGAvatar account={account} size={250} />,
    url: accountUrl(accountId),
    host,
  });
}

/**
 * Generate OpenGraph image for a product
 */
async function generateProductImage(
  accountId: string,
  productId: string,
  host: string
) {
  const product = await productsTable.fetchById(accountId, productId);

  if (!product) {
    return OpenGraphImage({
      title: "Product Not Found",
      host,
    });
  }

  return OpenGraphImage({
    title: product.title,
    subtitle: product.description,
    footer: `by ${product.account?.name || accountId}`,
    url: productUrl(accountId, productId),
    host,
  });
}

/**
 * Generate OpenGraph image with custom parameters
 */
function generateCustomImage(searchParams: URLSearchParams, host: string) {
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
    host,
  });
}

/**
 * Generate default OpenGraph image
 */
function generateDefaultImage(host: string) {
  return OpenGraphImage({
    title: "Source Cooperative",
    subtitle: "Geospatial Data Repository",
    host,
  });
}
