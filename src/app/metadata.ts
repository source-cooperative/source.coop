import type { Metadata } from 'next';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: {
    default: 'Source Cooperative',
    template: '%s | Source Cooperative'
  },
  description: 'A data publishing utility for the open web.',
  openGraph: {
    title: 'Source Cooperative',
    description: 'A data publishing utility for the open web.',
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
    icon: [
      { 
        url: '/favicon/light/icon.svg', 
        media: '(prefers-color-scheme: light)',
        type: 'image/svg+xml'
      },
      { 
        url: '/favicon/dark/icon.svg', 
        media: '(prefers-color-scheme: dark)',
        type: 'image/svg+xml'
      },
      { 
        url: '/favicon.ico',
        type: 'image/x-icon'
      }
    ],
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
    google: CONFIG.google.siteVerification,
  },
}; 