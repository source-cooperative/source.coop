import "@radix-ui/themes/styles.css";
import "@/styles/globals.css";
import { ThemeProvider } from "@/styles/theme";
import { SessionProvider } from "@ory/elements-react/client";
import { getServerSession } from "@ory/nextjs/app";
import { IBM_Plex_Sans } from "next/font/google";
import { Box } from "@radix-ui/themes";
import { Navigation, Footer /*, Banner*/ } from "@/components/layout";
import { Suspense } from "react";
import { metadata } from "./metadata";
import { CONFIG } from "@/lib/config";
import { headers } from "next/headers";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
});

export { metadata };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  console.debug("layout: session:", session);

  // Get the origin URL for the return_to parameter
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const origin = `${protocol}://${host}`;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={ibmPlexSans.variable}>
        <ThemeProvider
          attribute="class"
          enableSystem={true}
          defaultTheme="system"
          storageKey="source-theme"
        >
          <SessionProvider
            session={session}
            baseUrl={CONFIG.auth.api.frontendUrl}
          >
            <Box style={{ minHeight: "100vh" }}>
              {/* <Banner /> */}
              {/* <Suspense> */}
              <Navigation session={session} origin={origin} />
              {/* </Suspense> */}
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
