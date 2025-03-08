import '@radix-ui/themes/styles.css';
import '@/styles/globals.css';
import { Theme } from '@radix-ui/themes';
import { IBM_Plex_Sans } from 'next/font/google';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={ibmPlexSans.variable}>
        <Theme appearance="system" accentColor="blue" grayColor="sand" radius="medium">
          {children}
        </Theme>
      </body>
    </html>
  );
} 