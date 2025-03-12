import '@radix-ui/themes/styles.css';
import '@/styles/globals.css';
import { Theme } from '@radix-ui/themes';
import { ThemeProvider } from 'next-themes';
import { IBM_Plex_Sans } from 'next/font/google';
import { metadata } from './metadata';
import { Navigation } from '@/components/Navigation';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex',
});

export { metadata };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={ibmPlexSans.variable}>
        <ThemeProvider
          attribute="class"
          enableSystem={true}
          defaultTheme="system"
          storageKey="source-theme"
        >
          <Theme>
            <Navigation />
            <main>
              {children}
            </main>
          </Theme>
        </ThemeProvider>
      </body>
    </html>
  );
} 