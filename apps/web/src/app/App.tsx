import { Providers } from './providers';
import { ErrorBoundary } from './error-boundary';
import { HealthStatusCard } from '@/features/health/components/health-status-card';
import { SponsorForm } from '@/features/sponsors';

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <main className="flex min-h-screen flex-col items-center justify-start p-6 bg-background space-y-8 max-w-5xl mx-auto">
          <header className="w-full text-center space-y-2 py-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Projeto Fono — Web
            </h1>
            <p className="text-muted-foreground">
              Plataforma de acompanhamento e exercícios fonoaudiológicos.
            </p>
          </header>

          <HealthStatusCard />

          <section className="w-full flex justify-center">
            <SponsorForm />
          </section>
        </main>
      </Providers>
    </ErrorBoundary>
  );
}
