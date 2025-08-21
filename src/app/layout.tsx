import { IBM_Plex_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Box } from "@radix-ui/themes";
import { SessionProvider } from "@ory/elements-react/client";
import { Suspense } from "react";
import NextTopLoader from "nextjs-toploader";
import { getAccountFromSession } from "@/lib/actions/account";
import { Navigation } from "@/components/layout";
import { Footer } from "@/components/layout";
import { metadata } from "./metadata";
import { CONFIG } from "@/lib/config";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});

export { metadata };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getAccountFromSession();

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
          <SessionProvider baseUrl={CONFIG.auth.api.frontendUrl}>
            <Box style={{ minHeight: "100vh" }}>
              {/* <Banner /> */}
              <Suspense>
                <Navigation account={account} />
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
