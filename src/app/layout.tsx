import "@radix-ui/themes/styles.css";
import "@/styles/globals.css";
import { ThemeProvider } from "@/styles/theme";
import { SessionProvider } from "@ory/elements-react/client";
import NextTopLoader from "nextjs-toploader";
import { IBM_Plex_Sans } from "next/font/google";
import { S3CredentialsProvider, UploadProvider } from "@/components";
import { generateMetadata } from "./metadata";
import { CONFIG } from "@/lib/config";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
});

export { generateMetadata };

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={ibmPlexSans.variable} suppressHydrationWarning>
        <link
          rel="preconnect"
          href="https://assets.radiant.earth"
          crossOrigin=""
        />
        {CONFIG.auth.api.backendUrl && (
          <link rel="preconnect" href={CONFIG.auth.api.backendUrl} />
        )}
        <ThemeProvider
          attribute="class"
          enableSystem={true}
          defaultTheme="system"
          storageKey="source-theme"
        >
          <NextTopLoader />
          <NextIntlClientProvider>
            <SessionProvider>
              <S3CredentialsProvider>
                <UploadProvider>
                  {children}
                </UploadProvider>
              </S3CredentialsProvider>
            </SessionProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
