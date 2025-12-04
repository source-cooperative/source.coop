import { NotFoundPage } from "@/components/core";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Not Found | Source Cooperative",
  description: "The requested product could not be found.",
  openGraph: {
    title: "Product Not Found | Source Cooperative",
    description: "The requested product could not be found.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Product Not Found | Source Cooperative",
    description: "The requested product could not be found.",
  },
};

export default async function NotFound() {
  return <NotFoundPage title="Not Found" />;
}
