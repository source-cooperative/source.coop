import { PageHeader } from "@/components/layout";
import { ProductsList } from "@/components/features/products/ProductsList";
import { LandingPage } from "@/components";
import { getProducts } from "@/lib/actions/products";
import { getPageSession } from "@/lib/api/utils";
import { Box } from "@radix-ui/themes";

export const metadata = {
  title: "Featured Products | Source Cooperative",
  description: "Browse and discover public data products on Source.coop",
  openGraph: {
    title: "Featured Products | Source Cooperative",
    description: "Browse and discover public data products on Source.coop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Featured Products | Source Cooperative",
    description: "Browse and discover public data products on Source.coop",
  },
};

export default async function HomePage() {
  const session = await getPageSession();

  // Show landing page for unauthenticated users
  if (!session) {
    return <LandingPage />;
  }

  // Fetch featured products on the server for authenticated users
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
