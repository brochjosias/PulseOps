'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground">Não foi possível carregar esta página.</p>
            {error.digest && (
              <p className="text-xs text-muted-foreground">
                Código: <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </div>

          <Button onClick={reset} className="mt-2">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
