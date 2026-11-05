import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://pulse-ops-ashen.vercel.app'),
  title: 'PulseOps | Login',
  description:
    'Plataforma completa de gestão e análise operacional. Controle seus pedidos, clientes, produtos e acompanhe o faturamento com dashboards inteligentes.',
  openGraph: {
    title: 'PulseOps | Login',
    description:
      'Plataforma completa de gestão e análise operacional. Controle seus pedidos, clientes, produtos e acompanhe o faturamento com dashboards inteligentes.',
    url: 'https://pulse-ops-ashen.vercel.app/login',
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
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
