import * as React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { UserRole } from '@fono/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '../hooks/use-auth';

export interface RoleNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface RoleHomeShellProps {
  roleLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  navItems: readonly RoleNavItem[];
  showOptionalMfaAction?: boolean;
  children: React.ReactNode;
}

const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: 'Gestor do Sistema',
  PROFISSIONAL: 'Fonoaudiólogo',
  PACIENTE: 'Paciente',
  AUTONOMO: 'Usuário Autônomo',
};

export function RoleHomeShell({
  roleLabel,
  pageTitle,
  pageSubtitle,
  navItems,
  showOptionalMfaAction = false,
  children,
}: RoleHomeShellProps) {
  const { session, logout } = useAuth();
  const [activeNav, setActiveNav] = React.useState(navItems[0]?.id ?? 'overview');
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const user = session?.user;

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await logout('manual');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans antialiased">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col justify-between p-5 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div
              className="w-10 h-10 rounded-2xl bg-brand-amber text-brand-amber-foreground flex items-center justify-center font-extrabold shadow-xs text-lg"
              aria-hidden="true"
            >
              FG
            </div>
            <div>
              <span className="font-extrabold text-lg text-foreground tracking-tight block leading-tight">
                FonoGames
              </span>
              <span className="font-semibold text-xs text-primary tracking-wider uppercase block">
                {roleLabel}
              </span>
            </div>
          </div>

          <nav className="space-y-1.5" aria-label="Menu principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'bg-sidebar-active text-sidebar-active-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3">
          {showOptionalMfaAction && user && !user.mfaEnabled && (
            <div className="rounded-3xl bg-sidebar-card border border-sidebar-card-border p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                <h4 className="font-bold text-xs text-foreground">Segurança adicional</h4>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Proteja sua conta ativando a verificação em duas etapas por aplicativo autenticador.
              </p>
              <Link
                to="/mfa/configurar"
                className="inline-flex w-full items-center justify-center py-2 px-3 rounded-xl bg-brand-teal hover:bg-brand-teal-hover text-brand-teal-foreground font-bold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Configurar autenticação em 2 etapas (MFA)
              </Link>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
            {user && (
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-card-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{ROLE_DISPLAY_NAMES[user.role]}</Badge>
                  {user.mfaEnabled && <Badge variant="success">MFA Ativo</Badge>}
                </div>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleLogout()}
              disabled={isSigningOut}
              className="w-full h-10 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              {isSigningOut ? 'Saindo...' : 'Sair'}
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-6 lg:p-10 space-y-8 overflow-y-auto">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{pageSubtitle}</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-card border border-border text-sm">
                <span className="font-semibold text-card-foreground">{user.name}</span>
                <Badge variant="secondary">{ROLE_DISPLAY_NAMES[user.role]}</Badge>
              </div>
            )}
            {showOptionalMfaAction && user && !user.mfaEnabled && (
              <Link
                to="/mfa/configurar"
                className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-brand-teal hover:bg-brand-teal-hover text-brand-teal-foreground text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                Ativar MFA
              </Link>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleLogout()}
              disabled={isSigningOut}
              className="md:hidden rounded-2xl"
              aria-label="Sair da conta"
            >
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              Sair
            </Button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
