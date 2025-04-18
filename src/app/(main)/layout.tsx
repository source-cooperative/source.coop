import "@radix-ui/themes/styles.css";
import "@/styles/globals.css";
import { Navigation, Footer } from "@/components/layout";
import { Box } from "@radix-ui/themes";
import { Suspense } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense>
        <Navigation />
      </Suspense>
      <Box asChild my="6">
        <main>{children}</main>
      </Box>
      <Footer />
    </>
  );
}
