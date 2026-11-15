import { Providers } from './providers';
import { ErrorBoundary } from './error-boundary';
import { DashboardView } from '@/features/dashboard/components/dashboard-view';

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <DashboardView />
      </Providers>
    </ErrorBoundary>
  );
}
