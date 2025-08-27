"use client";
import { ThemeAwareImage } from "./ThemeAwareImage";
import { LogoLink } from "./LogoLink";
import Image from "next/image";
export function Logo() {
  const LogoImage = (
    <ThemeAwareImage
      lightSrc="/logotype-light.svg"
      darkSrc="/logotype-dark.svg"
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
      src="/logotype-light.svg"
      alt="Source Cooperative"
      width={243}
      height={74}
      priority
    />
  );
}
