import "@radix-ui/themes/styles.css";
import "@/styles/globals.css";
import { ThemeProvider } from "@/styles/theme";
import { SessionProvider } from "@ory/elements-react/client";
import { getServerSession } from "@ory/nextjs/app";
import { IBM_Plex_Sans } from "next/font/google";
import { metadata } from "./metadata";
import { Box } from "@radix-ui/themes";

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

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={ibmPlexSans.variable}>
        <ThemeProvider
          attribute="class"
          enableSystem={true}
          defaultTheme="system"
          storageKey="source-theme"
        >
          <SessionProvider session={session}>
            <Box style={{ minHeight: "100vh" }}>{children}</Box>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
