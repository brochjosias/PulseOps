import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Análises por categoria, canal e região" />
      <EmptyState
        icon={BarChart3}
        title="Em breve"
        description="Os gráficos de analytics estão sendo construídos."
      />
    </div>
  );
}
