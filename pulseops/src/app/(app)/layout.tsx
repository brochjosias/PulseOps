import { redirect } from 'next/navigation';

import { SidebarNav } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { LogoutButton } from '@/components/logout-button';
import { getSession } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ─── Sidebar (Desktop) ─── */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            P
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">PulseOps</span>
        </div>

        <SidebarNav />

        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
              {session.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{session.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{session.email}</p>
            </div>
          </div>

          <LogoutButton />
        </div>
      </aside>

      {/* ─── Área Principal ─── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header (Mobile) */}
        <header className="flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
          <MobileNav name={session.name} email={session.email} />
          <span className="ml-3 text-sm font-semibold">PulseOps</span>
        </header>

        {/* Conteúdo das páginas */}
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
