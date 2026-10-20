import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function GlobalNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-6 w-6 text-muted-foreground" />
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Página não encontrada</h2>
          <p className="text-sm text-muted-foreground">
            O endereço que você tentou acessar não existe.
          </p>
        </div>

        <Button asChild className="mt-2">
          <Link href="/dashboard">Ir para o início</Link>
        </Button>
      </div>
    </main>
  );
}
