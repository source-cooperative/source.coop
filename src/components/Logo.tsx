'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Logo() {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const LogoImage = (
    <Image
      src={resolvedTheme === 'dark' ? '/logotype-dark.svg' : '/logotype-light.svg'}
      alt="Source Cooperative"
      width={243}
      height={74}
      priority
    />
  );

  // Only wrap in Link if not on home page
  return pathname === '/' ? LogoImage : <Link href="/">{LogoImage}</Link>;
} 