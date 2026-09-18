import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BarChart3, LayoutDashboard, Package, Settings, ShoppingCart, Users } from 'lucide-react';

import { LogoutButton } from '@/components/logout-button';
import { getSession } from '@/lib/auth';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/orders', label: 'Pedidos', icon: ShoppingCart },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-white md:flex">
        <div className="border-b px-6 py-5 font-bold text-slate-900">PulseOps</div>

        <nav className="flex-1 space-y-1 p-3">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="px-3 pb-2">
            <p className="truncate text-sm font-medium text-slate-900">{session.name}</p>
            <p className="truncate text-xs text-slate-500">{session.email}</p>
          </div>

          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-slate-50 p-4 md:p-8">{children}</main>
    </div>
  );
}
