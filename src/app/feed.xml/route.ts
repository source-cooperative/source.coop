import { productsTable } from "@/lib/clients/database";

export async function GET() {
  try {
    // Fetch products for the feed
    const { products: productsWithoutAccounts } =
      await productsTable.listPublic();
    const products = await productsTable.attachAccounts(
      productsWithoutAccounts
    );

    // Generate RSS feed
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Source.coop Products</title>
    <link>https://source.coop</link>
    <description>Latest products on Source.coop</description>
    <language>en-us</language>
    ${products
      .map(
        (product) => `
      <item>
        <title>${product.title}</title>
        <description>${product.description || ""}</description>
        <link>https://source.coop/${product.account_id}/${
          product.product_id
        }</link>
        <guid>https://source.coop/${product.account_id}/${
          product.product_id
        }</guid>
        <pubDate>${new Date(product.created_at).toUTCString()}</pubDate>
      </item>
    `
      )
      .join("")}
  </channel>
</rss>`;

    // Return feed with proper content type
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error generating feed:", error);
    return new Response("Error generating feed", { status: 500 });
  }
}
