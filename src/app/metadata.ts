import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Source Cooperative',
    template: '%s | Source Cooperative'
  },
  description: 'A platform for sharing and discovering open data',
  openGraph: {
    title: 'Source Cooperative',
    description: 'A platform for sharing and discovering open data',
    url: 'https://source.coop',
    siteName: 'Source Cooperative',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    title: 'Source Cooperative',
    card: 'summary_large_image',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}; 