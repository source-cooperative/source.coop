'use client';

import { useTheme } from 'next-themes';
import Image, { ImageProps } from 'next/image';
import { useState, useEffect } from 'react';

interface ThemeAwareImageProps extends Omit<ImageProps, 'src'> {
  lightSrc: string;
  darkSrc: string;
}

export function ThemeAwareImage({ lightSrc, darkSrc, ...props }: ThemeAwareImageProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // During server render and initial client render, use light theme
  // to ensure consistency between server and client
  const src = !mounted ? lightSrc : (resolvedTheme === 'dark' ? darkSrc : lightSrc);
  
  return (
    <Image
      {...props}
      src={src}
    />
  );
} 