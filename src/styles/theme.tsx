import { Theme } from '@radix-ui/themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Theme
      appearance="light"
      accentColor="gray"
      grayColor="gray"
      radius="small"
      scaling="95%"
      fonts={{
        default: 'IBM Plex Sans, -apple-system, BlinkMacSystemFont, sans-serif',
        mono: 'Berkeley Mono, monospace',
      }}
    >
      {children}
    </Theme>
  );
}