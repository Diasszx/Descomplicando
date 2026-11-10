import { Providers } from './providers';
import { ErrorBoundary } from './error-boundary';
import { HealthStatusCard } from '@/features/health/components/health-status-card';

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background space-y-8">
          <header className="w-full max-w-xl text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Projeto Fono — Web
            </h1>
            <p className="text-muted-foreground">
              Plataforma de acompanhamento e exercícios fonoaudiológicos.
            </p>
          </header>
          <HealthStatusCard />
        </main>
      </Providers>
    </ErrorBoundary>
  );
}
