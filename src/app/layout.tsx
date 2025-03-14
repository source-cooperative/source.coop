import '@radix-ui/themes/styles.css';
import '@/styles/globals.css';
import { ThemeProvider } from '@/styles/theme';
import { IBM_Plex_Sans } from 'next/font/google';
import { metadata } from './metadata';
import { Navigation } from '@/components';
import { Container, Text, Box, Link } from '@radix-ui/themes';
import { Footer } from '@/components/layout/Footer';

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
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
          }}>
            <Navigation />
            <main style={{ 
              width: '100%',
            }}>
              {children}
            </main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
} 