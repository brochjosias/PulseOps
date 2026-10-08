'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Página <span className="text-foreground">{page}</span> de{' '}
        <span className="text-foreground">{totalPages}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft />
          Anterior
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
        >
          Próxima
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
