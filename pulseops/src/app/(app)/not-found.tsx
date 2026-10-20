import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Página não encontrada</h2>
            <p className="text-sm text-muted-foreground">
              O endereço que você tentou acessar não existe ou foi movido.
            </p>
          </div>

          <Button asChild className="mt-2">
            <Link href="/dashboard">Ir para o dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
