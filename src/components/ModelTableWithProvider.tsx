import { QueryProvider } from '@/components/QueryProvider';
import { ModelTable } from '@/components/ModelTable';

export function ModelTableWithProvider() {
  return (
    <QueryProvider>
      <ModelTable />
    </QueryProvider>
  );
}
