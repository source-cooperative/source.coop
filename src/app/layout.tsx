import { ibmPlexSans } from '@/styles/fonts';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={ibmPlexSans.className}>
      <body>{children}</body>
    </html>
  );
} 