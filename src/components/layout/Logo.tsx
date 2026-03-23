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
      lightSrc="/logo/logolockup-light.svg"
      darkSrc="/logo/logolockup-dark.svg"
      alt="Source Cooperative"
      width={200}
      height={40}
      priority
      style={{
        width: "auto",
        height: "clamp(36px, 16vw, 48px)", // Scale logo
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
