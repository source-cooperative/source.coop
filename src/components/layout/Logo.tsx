import { ThemeAwareImage } from './ThemeAwareImage';
import { LogoLink } from './LogoLink';

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