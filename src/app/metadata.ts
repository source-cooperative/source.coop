import { Metadata } from 'next';

export const metadata: Metadata = {
  icons: {
    // Basic favicon
    icon: [
      {
        media: '(prefers-color-scheme: light)',
        url: '/favicon/light/favicon.ico',
        href: '/favicon/light/favicon.ico',
      },
      {
        media: '(prefers-color-scheme: dark)',
        url: '/favicon/dark/favicon.ico',
        href: '/favicon/dark/favicon.ico',
      }
    ],
  }
}; 