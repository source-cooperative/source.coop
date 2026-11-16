"use client";
import { usePathname } from "next/navigation";
import { Link, Separator } from "@radix-ui/themes";
import NextLink from "next/link";
import styles from "./Navigation.module.css";
import { docsUrl, homeUrl, productListUrl } from "@/lib";

/**
 * Top-level nav links (Products + Docs) — shown to everyone, except on the
 * marketing homepage (which has its own sparse nav). Optionally trailed by a
 * vertical divider so the links + divider hide together.
 */
export function NavLinks({ divider = false }: { divider?: boolean }) {
  const pathname = usePathname();
  if (pathname === homeUrl()) return null;

  return (
    <>
      <Link asChild size="2" className={styles.productsLink}>
        <NextLink href={productListUrl()}>Products</NextLink>
      </Link>
      <Link size="2" href={docsUrl()} className={styles.productsLink}>
        Docs
      </Link>
      {divider && (
        <Separator orientation="vertical" style={{ height: "1.5rem" }} />
      )}
    </>
  );
}
