import "@radix-ui/themes/styles.css";
import "@/styles/globals.css";
import { ThemeProvider } from "@/styles/theme";
import { SessionProvider } from "@ory/elements-react/client";
import NextTopLoader from "nextjs-toploader";
import { IBM_Plex_Sans } from "next/font/google";
import { S3CredentialsProvider, UploadProvider } from "@/components";
import { metadata } from "./metadata";
import { CONFIG } from "@/lib/config";
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
      <body className={ibmPlexSans.variable} suppressHydrationWarning>
        {/* ponytail: cross-origin hosts on the critical path. Both are discovered
            late — the fonts only once globals.css parses — so the handshake
            otherwise starts cold. crossOrigin on the font host only: fonts are
            fetched in CORS mode, the Ory session request is credentialed. */}
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
          <SessionProvider>
            <S3CredentialsProvider>
              <UploadProvider>
                {children}
              </UploadProvider>
            </S3CredentialsProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
