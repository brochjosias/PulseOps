'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { SidebarNav } from './sidebar';
import { LogoutButton } from '@/components/logout-button';

export function MobileNav({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />

          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar md:hidden">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
                  P
                </div>
                <span className="text-sm font-semibold text-sidebar-foreground">PulseOps</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Passando a prop que acabamos de criar */}
            <SidebarNav isMobile={true} />

            <div className="mt-auto border-t border-sidebar-border p-3">
              <div className="mb-2 flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                  {name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-sidebar-foreground">{name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{email}</p>
                </div>
              </div>
              <LogoutButton />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
