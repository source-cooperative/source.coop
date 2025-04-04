import '@radix-ui/themes/styles.css';
import '@/styles/globals.css';
import { ThemeProvider } from '@/styles/theme';
import { IBM_Plex_Sans } from 'next/font/google';
import { metadata } from './metadata';
import { Navigation, Footer } from '@/components/layout';
import { Box } from '@radix-ui/themes';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { Suspense } from "react";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
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
          <SessionProvider>
            <Box style={{ minHeight: "100vh" }}>
              <Suspense>
                <Navigation />
              </Suspense>
              <Box asChild my="6">
                <main>{children}</main>
              </Box>
              <Footer />
            </Box>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 