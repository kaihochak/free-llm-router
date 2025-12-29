import { QueryProvider } from '@/components/QueryProvider';
import { ModelHero } from '@/components/ModelHero';

export function ModelHeroWithProvider() {
  return (
    <QueryProvider>
      <ModelHero />
    </QueryProvider>
  );
}
