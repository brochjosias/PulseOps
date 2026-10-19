import Link from 'next/link';
import { Building2, ScrollText, UserCog, Users } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const sections = [
  {
    href: '/settings/profile',
    label: 'Perfil',
    description: 'Seu nome e senha',
    icon: UserCog,
  },
  {
    href: '/settings/organization',
    label: 'Organização',
    description: 'Nome e slug da empresa',
    icon: Building2,
  },
  {
    href: '/settings/members',
    label: 'Membros',
    description: 'Quem tem acesso à organização',
    icon: Users,
  },
  {
    href: '/settings/audit',
    label: 'Auditoria',
    description: 'Ações sensíveis registradas',
    icon: ScrollText,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Organização, membros e preferências" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map(({ href, label, description, icon: Icon }) => (
          <Card key={href}>
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={href}>Abrir</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
