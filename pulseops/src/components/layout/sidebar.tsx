'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: LucideIcon };

const items: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/orders', label: 'Pedidos', icon: ShoppingCart },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function SidebarNav({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 p-2">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
              active
                ? 'bg-sidebar-active text-sidebar-foreground'
                : 'text-muted-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />

            {/* Lógica do texto: Se for mobile, mostra. Se for desktop, esconde até o hover */}
            <span
              className={cn(
                'truncate transition-opacity',
                isMobile
                  ? 'block opacity-100'
                  : 'hidden group-hover:block opacity-0 group-hover:opacity-100',
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
