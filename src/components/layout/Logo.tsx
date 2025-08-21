"use client";
import { ThemeAwareImage } from "./ThemeAwareImage";
import { LogoLink } from "./LogoLink";
import Image from "next/image";
export function Logo() {
  const LogoImage = (
    <ThemeAwareImage
      lightSrc="/logo/logotype-light.svg"
      darkSrc="/logo/logotype-dark.svg"
      alt="Source Cooperative"
      width={243}
      height={74}
      priority
    />
  );

  return <LogoLink>{LogoImage}</LogoLink>;
}

export function LightLogo() {
  return (
    <Image
      src="/logo/logotype-light.svg"
      alt="Source Cooperative"
      width={243}
      height={74}
      priority
    />
  );
}
