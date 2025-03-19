import { ThemeAwareImage } from '../layout/ThemeAwareImage';
import { LogoLink } from '../layout/LogoLink';

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