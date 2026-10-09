import { PageHeader } from "@/components/layout";
import { ProductsList } from "@/components/features/products/ProductsList";
import { ProductsFilters } from "@/components/features/products/ProductsFilters";
import { getPaginatedProducts } from "@/lib/actions/products";
import { Badge, Box, Flex, Text } from "@radix-ui/themes";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ProductsPage");
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    tags?: string;
    cursor?: string;
    previous?: string;
    featured?: string;
  }>;
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const { search, tags, cursor, previous, featured } = await searchParams;

  const featuredOnly = featured === "1";
  const filters = search || tags || featuredOnly
    ? { search, tags, featuredOnly: featuredOnly || undefined }
    : undefined;
  const { products, hasNextPage, hasPreviousPage, nextCursor, previousCursor } =
    await getPaginatedProducts(100, cursor, previous, undefined, filters);

  const hasActiveFilters = search || tags || featuredOnly;
  const t = await getTranslations("ProductsPage");

  return (
    <Box>
      <PageHeader title={t("title")} />

      <ProductsFilters />

      {hasActiveFilters && (
        <Flex gap="2" align="center" mb="3">
          <Text size="2" color="gray">
            {t("showingCount", { count: products.length })}
          </Text>
          {search && (
            <Badge variant="soft" color="blue">
              {t("searchBadge", { search })}
            </Badge>
          )}
          {tags && (
            <Badge variant="soft" color="green">
              {t("tagsBadge", { tags })}
            </Badge>
          )}
          {featuredOnly && (
            <Badge variant="soft" color="orange">
              {t("featured")}
            </Badge>
          )}
        </Flex>
      )}

      <ProductsList
        products={products}
        pagination={{
          hasNextPage,
          hasPreviousPage,
          nextCursor,
          previousCursor,
          currentCursor: cursor,
        }}
      />
    </Box>
  );
}
