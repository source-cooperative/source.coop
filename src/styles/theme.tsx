'use client';
import { Theme } from '@radix-ui/themes';
import { ThemeProvider as NextThemeProvider, useTheme, type Attribute } from 'next-themes';
import { useEffect, useState } from 'react';

// This component applies Radix theme based on the next-themes value
function RadixTheme({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  
  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Common theme properties
  const themeProps = {
    accentColor: "gray",
    grayColor: "gray",
    radius: "none",
    scaling: "110%"
  };
  
  // During SSR or before hydration, render with a default theme to prevent flicker
  if (!isMounted) {
    return (
      <Theme {...themeProps}>
        {children}
      </Theme>
    );
  }
  
  return (
    <Theme
      appearance={resolvedTheme as 'light' | 'dark'}
      {...themeProps}
    >
      {children}
    </Theme>
  );
}

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: Attribute;
  enableSystem?: boolean;
  defaultTheme?: string;
  storageKey?: string;
}

export function ThemeProvider({ 
  children,
  attribute = 'class',
  enableSystem = true,
  defaultTheme = 'system',
  storageKey = 'source-theme'
}: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute={attribute}
      enableSystem={enableSystem}
      defaultTheme={defaultTheme}
      storageKey={storageKey}
    >
      <RadixTheme>
        {children}
      </RadixTheme>
    </NextThemeProvider>
  );
}