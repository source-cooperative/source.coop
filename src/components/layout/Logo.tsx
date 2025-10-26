"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeAwareImage } from "./ThemeAwareImage";
import styles from "./Navigation.module.css";
import { homeUrl } from "@/lib/urls";

export function Logo() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const logoImage = (
    <ThemeAwareImage
      lightSrc="/logo/logotype-light.svg"
      darkSrc="/logo/logotype-dark.svg"
      alt="Source Cooperative"
      width={243}
      height={74}
      priority
      style={{
        width: "auto",
        height: "clamp(52px, 16vw, 74px)", // Scale logo
      }}
    />
  );

  if (isHomePage) {
    return <div className={styles.logo}>{logoImage}</div>;
  }

  return (
    <Link href={homeUrl()} className={styles.logo}>
      {logoImage}
    </Link>
  );
}
