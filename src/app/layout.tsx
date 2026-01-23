import "@radix-ui/themes/styles.css";
import "@/styles/globals.css";
import { ThemeProvider } from "@/styles/theme";
import { SessionProvider } from "@ory/elements-react/client";
import NextTopLoader from "nextjs-toploader";
import { IBM_Plex_Sans } from "next/font/google";
import { Container } from "@radix-ui/themes";
import {
  S3CredentialsProvider,
  UploadProvider,
  Navigation,
  Footer,
} from "@/components";
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
      <body className={ibmPlexSans.variable} suppressHydrationWarning>
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
                <Navigation />
                {/* <Container py="4" m="0"> */}
                  <main>{children}</main>
                {/* </Container> */}
              </UploadProvider>
            </S3CredentialsProvider>
            <Footer />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
