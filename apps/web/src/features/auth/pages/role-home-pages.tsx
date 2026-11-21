import {
  Activity,
  BookOpen,
  ClipboardList,
  Gamepad2,
  Home,
  LayoutGrid,
  Shield,
  Users,
} from 'lucide-react';
import { GameCard } from '@/components/ui/game-card';
import { RoleHomeShell } from '../components/role-home-shell';

export function AdminHomePage() {
  return (
    <RoleHomeShell
      roleLabel="Gestão do Sistema"
      pageTitle="Painel Administrativo"
      pageSubtitle="Gerenciamento global de conteúdos terapêuticos, profissionais e segurança clínica."
      navItems={[
        { id: 'overview', label: 'Visão Geral', icon: Home },
        { id: 'professionals', label: 'Profissionais', icon: Users },
        { id: 'catalog', label: 'Conteúdos Base', icon: LayoutGrid },
        { id: 'security', label: 'Segurança e MFA', icon: Shield },
      ]}
    >
      <section aria-label="Resumo administrativo" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-3xl p-6 border border-border shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-game-purple-subtle text-game-purple-foreground flex items-center justify-center">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-card-foreground">Contas de Profissionais</h2>
          <p className="text-sm text-muted-foreground">
            Controle de fonoaudiólogos cadastrados, permissões clínicas e suporte a redefinição de
            MFA TOTP.
          </p>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-game-blue-subtle text-game-blue-foreground flex items-center justify-center">
            <LayoutGrid className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-card-foreground">Catálogo Terapêutico</h2>
          <p className="text-sm text-muted-foreground">
            Áreas terapêuticas, habilidades fonoaudiológicas e atividades gamificadas disponíveis na
            plataforma.
          </p>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-game-emerald-subtle text-game-emerald-foreground flex items-center justify-center">
            <Shield className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-card-foreground">Sessão Protegida com MFA</h2>
          <p className="text-sm text-muted-foreground">
            Autenticação multifator TOTP verificada e timeout automático de 30 minutos ativo em todas
            as abas.
          </p>
        </div>
      </section>
    </RoleHomeShell>
  );
}

export function ProfissionalHomePage() {
  return (
    <RoleHomeShell
      roleLabel="Área Clínica"
      pageTitle="Painel do Fonoaudiólogo"
      pageSubtitle="Acompanhe seus pacientes, prescreva planos terapêuticos e acesse atividades clínicas."
      navItems={[
        { id: 'overview', label: 'Visão Geral', icon: Home },
        { id: 'patients', label: 'Meus Pacientes', icon: Users },
        { id: 'plans', label: 'Planos Terapêuticos', icon: ClipboardList },
        { id: 'metrics', label: 'Evolução Clínica', icon: Activity },
      ]}
    >
      <section aria-label="Resumo clínico" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-3xl p-6 border border-border shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-game-rose-subtle text-game-rose-foreground flex items-center justify-center">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-card-foreground">Carteira de Pacientes</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie seus pacientes com isolamento completo de prontuários e credenciais de primeiro
            acesso.
          </p>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-game-amber-subtle text-game-amber-foreground flex items-center justify-center">
            <ClipboardList className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-card-foreground">Prescrição de Jogos</h2>
          <p className="text-sm text-muted-foreground">
            Selecione atividades fonoaudiológicas alinhadas aos objetivos terapêuticos individuais.
          </p>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-game-emerald-subtle text-game-emerald-foreground flex items-center justify-center">
            <Shield className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-card-foreground">Acesso Clínico Verificado</h2>
          <p className="text-sm text-muted-foreground">
            MFA TOTP ativo e encerramento sincronizado de sessão para proteção em computadores da
            clínica.
          </p>
        </div>
      </section>
    </RoleHomeShell>
  );
}

export function PacienteHomePage() {
  return (
    <RoleHomeShell
      roleLabel="Meu Plano"
      pageTitle="Minhas Atividades"
      pageSubtitle="Jogos fonoaudiológicos liberados no seu plano terapêutico."
      showOptionalMfaAction
      navItems={[
        { id: 'overview', label: 'Meus Jogos', icon: Gamepad2 },
        { id: 'lessons', label: 'Plano Terapêutico', icon: BookOpen },
      ]}
    >
      <section aria-label="Jogos liberados no plano terapêutico" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Jogos Liberados</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete os exercícios indicados pelo seu fonoaudiólogo para acompanhar sua evolução.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          <GameCard
            title="A-E-I-O-U (Vogais)"
            itemsCount={10}
            unitLabel="Exercícios"
            theme="rose"
            difficultyBadge="Nível Fácil"
          />
          <GameCard
            title="Consciência Fonológica dos Animais"
            itemsCount={9}
            unitLabel="Práticas"
            theme="emerald"
            difficultyBadge="Nível Fácil"
          />
          <GameCard
            title="Raciocínio & Números Sonoros"
            itemsCount={12}
            unitLabel="Desafios"
            theme="blue"
            difficultyBadge="Nível Médio"
          />
        </div>
      </section>
    </RoleHomeShell>
  );
}
