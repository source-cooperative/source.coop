import '@radix-ui/themes/styles.css';  // Radix UI styles first
import '@/styles/globals.css';         // Our custom styles second
import { IBM_Plex_Sans } from 'next/font/google';
import { ThemeProvider } from '@/styles/theme';
import type { AppProps } from 'next/app';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={ibmPlexSans.className}>
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
    </div>
  );
}
