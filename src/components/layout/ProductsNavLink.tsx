"use client";
import { usePathname } from "next/navigation";
import { Link, Separator } from "@radix-ui/themes";
import NextLink from "next/link";
import styles from "./Navigation.module.css";
import { homeUrl, productListUrl } from "@/lib";

/**
 * The all-products nav link — shown to everyone, except on the marketing
 * homepage (which already features products). Optionally trailed by a vertical
 * divider so the link + divider hide together.
 */
export function ProductsNavLink({ divider = false }: { divider?: boolean }) {
  const pathname = usePathname();
  if (pathname === homeUrl()) return null;

  return (
    <>
      <Link asChild size="3" className={styles.productsLink}>
        <NextLink href={productListUrl()}>Products</NextLink>
      </Link>
      {divider && (
        <Separator orientation="vertical" style={{ height: "1.5rem" }} />
      )}
    </>
  );
}
