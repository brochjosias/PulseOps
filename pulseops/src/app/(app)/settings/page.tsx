import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Organização, membros e preferências" />
      <EmptyState
        icon={Settings}
        title="Em breve"
        description="As configurações estão sendo construídas."
      />
    </div>
  );
}
