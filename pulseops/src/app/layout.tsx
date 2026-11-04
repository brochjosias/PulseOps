import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { Providers } from './providers';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pulse-ops-oinq.vercel.app'),

  title: 'PulseOps',
  description: 'Plataforma de gestão e análise operacional',

  openGraph: {
    title: 'PulseOps',
    description: 'Plataforma de gestão e análise operacional',
    url: 'https://pulse-ops-oinq.vercel.app',
    siteName: 'PulseOps',
    images: [
      {
        url: '/og-image-pulseops.png',
        width: 1200,
        height: 630,
        alt: 'PulseOps',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'PulseOps',
    description: 'Plataforma de gestão e análise operacional',
    images: ['/og-image-pulseops.png'],
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
