import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthLayout({
  title,
  description,
  children,
  footer,
  className,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased">
      <div className="w-full max-w-md space-y-6">
        <header className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl bg-brand-amber text-brand-amber-foreground flex items-center justify-center font-extrabold shadow-xs text-xl"
              aria-hidden="true"
            >
              FG
            </div>
            <div className="text-left">
              <span className="font-extrabold text-xl text-foreground tracking-tight block leading-tight">
                FonoGames
              </span>
              <span className="font-semibold text-xs text-primary tracking-wider uppercase block">
                Plataforma Clínica
              </span>
            </div>
          </div>
        </header>

        <main
          className={cn(
            'bg-card text-card-foreground rounded-3xl border border-border shadow-xs p-6 sm:p-8 space-y-6',
            className,
          )}
        >
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-card-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {children}
        </main>

        {footer && (
          <footer className="text-center text-sm text-muted-foreground">{footer}</footer>
        )}
      </div>
    </div>
  );
}
