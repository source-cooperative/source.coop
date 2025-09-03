import "@radix-ui/themes/styles.css";
import "@/styles/globals.css";
import { ThemeProvider } from "@/styles/theme";
import { SessionProvider } from "@ory/elements-react/client";
import NextTopLoader from "nextjs-toploader";
import { IBM_Plex_Sans } from "next/font/google";
import { Box } from "@radix-ui/themes";
import { Navigation, Footer } from "@/components/layout";
import { metadata } from "./metadata";
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
});

export { metadata };

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={ibmPlexSans.variable}>
        <ThemeProvider
          attribute="class"
          enableSystem={true}
          defaultTheme="system"
          storageKey="source-theme"
        >
          <NextTopLoader />
          <SessionProvider>
            <Box style={{ minHeight: "100vh" }}>
              <Navigation />
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
