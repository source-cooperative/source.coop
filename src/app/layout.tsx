import "@radix-ui/themes/styles.css";
import "@/styles/globals.css";
import { ThemeProvider } from "@/styles/theme";
import { SessionProvider } from "@ory/elements-react/client";
import NextTopLoader from "nextjs-toploader";
import { IBM_Plex_Sans } from "next/font/google";
import { Box } from "@radix-ui/themes";
import { Navigation, Footer /*, Banner*/ } from "@/components/layout";
import { Suspense } from "react";
import { metadata } from "./metadata";
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
});

export { metadata };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function updateFavicon() {
                  const isDark = document.documentElement.classList.contains('dark');
                  const favicon = document.querySelector('link[rel="icon"]');
                  if (favicon) {
                    favicon.href = isDark ? '/favicon-dark.ico' : '/favicon.ico';
                  }
                }
                
                // Update on theme change
                const observer = new MutationObserver(updateFavicon);
                observer.observe(document.documentElement, {
                  attributes: true,
                  attributeFilter: ['class']
                });
                
                // Initial update
                updateFavicon();
              })();
            `,
          }}
        />
      </head>
      <body className={ibmPlexSans.variable}>
        <ThemeProvider
          attribute="class"
          enableSystem={true}
          defaultTheme="system"
          storageKey="source-theme"
        >
          <NextTopLoader />
          <SessionProvider>
            <Box 
              style={{ 
                minHeight: "100vh",
                background: "var(--gray-1)"
              }}
            >
              {/* <Banner /> */}
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
