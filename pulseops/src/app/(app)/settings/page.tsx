import Link from 'next/link';
import { ScrollText, Settings } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Organização, membros e preferências" />

      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Auditoria</p>
              <p className="text-xs text-muted-foreground">
                Registro de ações sensíveis da organização
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/audit">Ver log</Link>
          </Button>
        </CardContent>
      </Card>

      <EmptyState
        icon={Settings}
        title="Mais opções em breve"
        description="Perfil, membros e preferências da organização."
      />
    </div>
  );
}
