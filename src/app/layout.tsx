import "@radix-ui/themes/styles.css";
import "@/styles/globals.css";
import { ThemeProvider } from "@/styles/theme";
import { SessionProvider } from "@ory/elements-react/client";
import { getServerSession } from "@ory/nextjs/app";
import NextTopLoader from "nextjs-toploader";
import { IBM_Plex_Sans } from "next/font/google";
import { Box } from "@radix-ui/themes";
import { Navigation, Footer /*, Banner*/ } from "@/components/layout";
import { Suspense } from "react";
import { metadata } from "./metadata";
import { CONFIG } from "@/lib/config";
import { getOryId } from "@/lib/ory";
import { accountsTable } from "@/lib/clients/database";
import { Account } from "@/types/account";
import { redirect, RedirectType } from "next/navigation";
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
  let account: Account | null = null;
  if (session) {
    const oryId = getOryId(session);
    if (oryId) {
      account = await accountsTable.fetchByOryId(oryId);
    } else {
      // If we have a session but no account, that means a user is authenticated but we need
      // to redirect to the email verification page so that a user can setup their account.
      if (session && !account) {
        redirect("/onboarding", RedirectType.replace);
      }
    }
  }

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
          <SessionProvider
            session={session}
            baseUrl={CONFIG.auth.api.frontendUrl}
          >
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
