import { redirect } from 'next/navigation';

import { SidebarNav } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { LogoutButton } from '@/components/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { getSession } from '@/lib/auth';
import { PageTransition } from '@/components/layout/page-transition';
import { AiChat } from '@/components/ai-chat'; // <-- IMPORT AQUI

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      {/* ─── Sidebar (Desktop) - Retrátil no Hover ─── */}
      <aside className="group fixed inset-y-0 left-0 z-40 hidden w-16 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-500 ease-in-out hover:w-60 md:flex">
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            P
          </div>
          <span className="ml-3 hidden whitespace-nowrap text-sm font-semibold text-sidebar-foreground group-hover:block">
            PulseOps
          </span>
        </div>

        {/* Links de Navegação */}
        <SidebarNav />

        {/* Rodapé (Perfil + Logout) */}
        <div className="mt-auto border-t border-sidebar-border p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-md px-1 py-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
              {session.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden min-w-0 flex-1 group-hover:block">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{session.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{session.email}</p>
            </div>
          </div>
          <div className="hidden group-hover:block">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ─── Área Principal ─── */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-16">
        {/* Header (Mobile) */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
          <div className="flex items-center">
            <MobileNav name={session.name} email={session.email} />
            <span className="ml-3 text-sm font-semibold">PulseOps</span>
          </div>
          <ThemeToggle />
        </header>

        {/* Header (Desktop) - Apenas para posicionar o botão de tema */}
        <header className="hidden h-14 items-center justify-end border-b border-border bg-background px-8 md:flex">
          <ThemeToggle />
        </header>

        {/* Conteúdo das páginas */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {/* Agente de IA - Fica flutuando na tela inteira */}
      <AiChat />
    </div>
  );
}
