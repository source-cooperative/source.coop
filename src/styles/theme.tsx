'use client';
import { Theme } from '@radix-ui/themes';
import { ThemeProvider as NextThemeProvider, useTheme, type Attribute } from 'next-themes';
import { useEffect, useState } from 'react';

// Custom color palette - Radix-style 12-step scale from #121a1b to #EFEBEA
const lightColors = {
  gray: {
    1: '#EFEBEA',   // Lightest background
    2: '#E8E4E3',   // Subtle background
    3: '#E1DDDC',   // Background
    4: '#DAD6D5',   // Background hover
    5: '#D3CFCE',   // Background active
    6: '#CCC8C7',   // Border subtle
    7: '#C5C1C0',   // Border
    8: '#BEBBB9',   // Border hover
    9: '#B7B4B2',   // Border active
    10: '#B0ADAB',  // Solid
    11: '#A9A6A4',  // Solid hover
    12: '#121a1b',  // High contrast text
  },
  accent: {
    1: '#EFEBEA',   // Lightest background
    2: '#E8E4E3',   // Subtle background
    3: '#E1DDDC',   // Background
    4: '#DAD6D5',   // Background hover
    5: '#D3CFCE',   // Background active
    6: '#CCC8C7',   // Border subtle
    7: '#C5C1C0',   // Border
    8: '#BEBBB9',   // Border hover
    9: '#B7B4B2',   // Border active
    10: '#B0ADAB',  // Solid
    11: '#A9A6A4',  // Solid hover
    12: '#121a1b',  // High contrast text
    13: '#121a1b',  // Highest contrast
  }
};

const darkColors = {
  gray: {
    1: '#121a1b',   // Darkest background
    2: '#1a2223',   // Subtle background
    3: '#222a2b',   // Background
    4: '#2a3233',   // Background hover
    5: '#323a3b',   // Background active
    6: '#3a4243',   // Border subtle
    7: '#424a4b',   // Border
    8: '#4a5253',   // Border hover
    9: '#525a5b',   // Border active
    10: '#5a6263',  // Solid
    11: '#626a6b',  // Solid hover
    12: '#EFEBEA',  // High contrast text
  },
  accent: {
    1: '#121a1b',   // Darkest background
    2: '#1a2223',   // Subtle background
    3: '#222a2b',   // Background
    4: '#2a3233',   // Background hover
    5: '#323a3b',   // Background active
    6: '#3a4243',   // Border subtle
    7: '#424a4b',   // Border
    8: '#4a5253',   // Border hover
    9: '#525a5b',   // Border active
    10: '#5a6263',  // Solid
    11: '#626a6b',  // Solid hover
    12: '#EFEBEA',  // High contrast text
    13: '#EFEBEA',  // Highest contrast
  }
};

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
    accentColor: "gray" as const,
    grayColor: "gray" as const,
    radius: "none" as const,
    scaling: "110%" as const
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