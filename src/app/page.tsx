import { PageHeader } from "@/components/layout";
import { ProductsList } from "@/components/features/products/ProductsList";
import { getProducts } from "@/lib/actions/products";
import { Box } from "@radix-ui/themes";

export const metadata = {
  title: "Featured Products | Source Cooperative",
  description: "Browse and discover public data products on Source.coop",
  openGraph: {
    title: "Featured Products | Source Cooperative",
    description: "Browse and discover public data products on Source.coop",
    type: "website",
    // TODO: Add image here
    // images: [{ url: '/og-image.png' }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Featured Products | Source Cooperative",
    description: "Browse and discover public data products on Source.coop",
    // TODO: Add image here
    // images: ['/og-image.png'],
  },
};

export default async function HomePage() {
  // Fetch featured products on the server
  const result = await getProducts({
    featuredOnly: true,
    limit: 10,
  });

  return (
    <Box>
      <PageHeader title="Featured Products" />
      <ProductsList products={result.products} />
    </Box>
  );
}
