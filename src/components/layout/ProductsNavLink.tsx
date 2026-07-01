import { Link } from "@radix-ui/themes";
import NextLink from "next/link";
import styles from "./Navigation.module.css";
import { productListUrl } from "@/lib";

/** The all-products nav link — shown to everyone, on the marketing and app nav. */
export function ProductsNavLink() {
  return (
    <Link asChild size="3" className={styles.productsLink}>
      <NextLink href={productListUrl()}>Products</NextLink>
    </Link>
  );
}
