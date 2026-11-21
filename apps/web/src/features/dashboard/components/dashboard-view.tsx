import * as React from 'react';
import {
  Home,
  BookOpen,
  Users,
  Activity,
  Bell,
  Search,
  CheckCircle2,
  PlayCircle,
  ArrowUpRight,
  Sparkles,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { GameCard, type GameCategoryTheme } from '@/components/ui/game-card';
import { cn } from '@/lib/utils';
import { PatientsView } from '@/features/patients/components/patients-view';
import { type Patient } from '@/features/patients/types';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'patients', label: 'Pacientes', icon: Users },
  { id: 'lessons', label: 'Exercícios & Jogos', icon: BookOpen },
];

interface RecentPatient {
  id: string;
  name: string;
  age: string;
  condition: string;
  lastSession: string;
  progressPercent: number;
}

const RECENT_PATIENTS: RecentPatient[] = [
  {
    id: 'p1',
    name: 'Lucas Gabriel Silveira',
    age: '7 anos',
    condition: 'Troca articulatória (/r/ e /l/)',
    lastSession: 'Hoje às 14:30',
    progressPercent: 78,
  },
  {
    id: 'p2',
    name: 'Helena Duarte Ramos',
    age: '5 anos',
    condition: 'Atraso simples de linguagem',
    lastSession: 'Ontem às 10:00',
    progressPercent: 64,
  },
  {
    id: 'p3',
    name: 'Theo Mendonça',
    age: '8 anos',
    condition: 'Consciência fonológica e rima',
    lastSession: '18/11 às 16:00',
    progressPercent: 90,
  },
];

interface GameItem {
  id: string;
  title: string;
  itemsCount: number;
  unitLabel: string;
  category: string;
  theme: GameCategoryTheme;
  difficultyBadge: string;
}

const SAMPLE_GAMES: GameItem[] = [
  {
    id: '1',
    title: 'A-E-I-O-U & Sons Vocálicos',
    itemsCount: 10,
    unitLabel: 'Exercícios',
    category: 'Vogais & Articulação',
    theme: 'rose',
    difficultyBadge: 'Iniciante',
  },
  {
    id: '2',
    title: 'Identificação de Sons e Tonalidades',
    itemsCount: 8,
    unitLabel: 'Áudios',
    category: 'Percepção Auditiva',
    theme: 'amber',
    difficultyBadge: 'Iniciante',
  },
  {
    id: '3',
    title: 'Raciocínio & Sequências Fonológicas',
    itemsCount: 12,
    unitLabel: 'Etapas',
    category: 'Consciência Fonológica',
    theme: 'blue',
    difficultyBadge: 'Intermediário',
  },
  {
    id: '4',
    title: 'Motricidade Orofacial & Respiração',
    itemsCount: 14,
    unitLabel: 'Práticas',
    category: 'Musculatura Oral',
    theme: 'emerald',
    difficultyBadge: 'Avançado',
  },
];

export const DashboardView: React.FC = () => {
  const [activeNav, setActiveNav] = React.useState('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [selectedPatientContext, setSelectedPatientContext] = React.useState<Patient | null>(null);

  const handleActionClick = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSelectPatientContext = (patient: Patient | null) => {
    setSelectedPatientContext(patient);
    if (patient) {
      setFeedback(`Contexto ativo: ${patient.nome}. Partidas gravadas no prontuário.`);
    } else {
      setFeedback('Contexto livre: Seu Perfil Profissional (modo testes).');
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans antialiased">
      {/* 1. SIDEBAR LATERAL NAVEGAÇÃO COM SUPORTE A RECOLHIMENTO */}
      <aside
        className={cn(
          'bg-sidebar border-r border-sidebar-border flex flex-col justify-between shrink-0 hidden md:flex transition-all duration-300 ease-in-out',
          isSidebarCollapsed ? 'w-20 p-3' : 'w-64 p-5',
        )}
      >
        <div className="space-y-6">
          {/* Topo: Logo / Identidade + Botão de Recolher/Expandir */}
          <div
            className={cn(
              'flex items-center gap-2',
              isSidebarCollapsed ? 'flex-col justify-center' : 'justify-between px-1 py-1',
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                FG
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0 animate-in fade-in duration-200">
                  <span className="font-extrabold text-lg text-sidebar-foreground tracking-tight block leading-tight truncate">
                    FonoGames
                  </span>
                  <span className="font-medium text-xs text-sidebar-muted block truncate">
                    Saúde & Educação
                  </span>
                </div>
              )}
            </div>

            {/* Ícone no lado superior direito da sidebar para expandir/retrair */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-label={isSidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
              title={isSidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
              className="p-1.5 rounded-lg border border-sidebar-card-border bg-sidebar-card text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-card/80 transition-colors shrink-0 shadow-2xs"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navegação */}
          <nav className="space-y-1.5" aria-label="Menu principal">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200',
                    isSidebarCollapsed
                      ? 'justify-center p-3'
                      : 'gap-3 px-3.5 py-2.5',
                    isSelected
                      ? 'bg-sidebar-active text-sidebar-active-foreground shadow-xs font-semibold'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-card/80 hover:text-sidebar-foreground transition-colors',
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="truncate animate-in fade-in duration-200">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Card Clínico de Apoio na Sidebar (Visível quando expandido; ícone simples quando recolhido) */}
        {!isSidebarCollapsed ? (
          <div className="rounded-2xl bg-sidebar-card border border-sidebar-card-border p-4 space-y-2.5 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <h4 className="font-bold text-xs text-sidebar-foreground">Ambiente Clínico</h4>
            </div>
            <p className="text-[12px] leading-relaxed text-sidebar-muted">
              Acompanhe o engajamento dos exercícios lúdicos em tempo real com relatórios detalhados.
            </p>
            <button
              type="button"
              onClick={() => handleActionClick('Acessando configurações do plano clínico.')}
              className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-xs transition-colors shadow-xs"
            >
              Ver Relatório Geral
            </button>
          </div>
        ) : (
          <div className="flex justify-center pb-2 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={() => handleActionClick('Acessando configurações do plano clínico.')}
              title="Ambiente Clínico - Ver Relatório"
              className="p-2.5 rounded-xl bg-sidebar-card border border-sidebar-card-border text-primary hover:bg-sidebar-card/80 transition-colors shadow-xs"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>

      {/* 2. ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col p-6 lg:p-10 space-y-8 overflow-y-auto">
        {/* Cabeçalho */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
              Painel Fonoaudiológico
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestão clínica humanizada e atividades lúdicas integradas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar paciente ou teste..."
                className="pl-9 pr-4 py-2 text-xs rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary w-52 sm:w-64 transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => handleActionClick('Nenhuma notificação pendente.')}
              className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted/80 transition-all shadow-xs"
              aria-label="Notificações"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Feedback visual dinâmico e Banner do Context Switcher */}
        {selectedPatientContext && (
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-primary">
                    Contexto de Atendimento Ativo
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-background border border-border text-foreground font-semibold">
                    {selectedPatientContext.faixa_etaria}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  {selectedPatientContext.nome}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Meta: {selectedPatientContext.objetivoAtivo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveNav('lessons')}
                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Jogar com Paciente</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPatientContext(null)}
                className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-background text-foreground text-xs font-semibold transition-colors flex items-center gap-1"
                title="Voltar para modo de testes livres do fonoaudiólogo"
              >
                <UserX className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Desmarcar</span>
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <div className="p-3.5 rounded-xl bg-card border border-primary/30 text-primary font-semibold text-xs animate-in fade-in">
            {feedback}
          </div>
        )}

        {/* 3. CONTEÚDO CONDICIONAL DE ACORDO COM A ABA SELECIONADA */}
        {activeNav === 'patients' && (
          <PatientsView
            selectedPatientContextId={selectedPatientContext?.id}
            onSelectPatientContext={handleSelectPatientContext}
            onNavigateToGames={() => setActiveNav('lessons')}
          />
        )}

        {activeNav === 'home' && (
          <>
            {/* 3.1 CARDS DE RESUMO CLÍNICO (Tokens Semânticos bg-card) */}
        <section aria-label="Resumo clínico rápido" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl p-5 border border-border shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Pacientes Ativos
              </span>
              <span className="text-3xl font-black text-foreground mt-1 block">24</span>
              <span className="text-[11px] text-primary font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> 100% com plano atualizado
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Exercícios Realizados
              </span>
              <span className="text-3xl font-black text-foreground mt-1 block">142</span>
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-1">
                <Activity className="w-3 h-3" /> +18 nas últimas 24h
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Exercícios em Andamento
              </span>
              <span className="text-3xl font-black text-foreground mt-1 block">8</span>
              <span className="text-[11px] text-primary-hover font-medium flex items-center gap-1 mt-1">
                <PlayCircle className="w-3 h-3" /> 3 pacientes ativos agora
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <PlayCircle className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* 4. PACIENTES RECENTES (Superfície bg-card-patient com border-border) */}
        <section aria-label="Pacientes recentes" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Pacientes Recentes
              </h2>
              <p className="text-xs text-muted-foreground">
                Acompanhe o histórico clínico recente e evolução dos atendimentos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleActionClick('Abrindo lista completa de pacientes.')}
              className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            >
              <span>Ver todos</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RECENT_PATIENTS.map((patient) => (
              <div
                key={patient.id}
                className="bg-card-patient rounded-2xl p-4 border border-border shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-foreground leading-tight">
                      {patient.name}
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary-hover font-semibold shrink-0">
                      {patient.age}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                    {patient.condition}
                  </p>
                  <p className="text-[11px] text-foreground/70 mt-1">
                    Último atendimento: {patient.lastSession}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-foreground mb-1">
                    <span>Evolução terapêutica</span>
                    <span className="text-primary">{patient.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-background h-2 rounded-full overflow-hidden border border-border/40">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${patient.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. JOGOS E EXERCÍCIOS FONOAUDIOLÓGICOS */}
        <section aria-label="Catálogo de jogos e exercícios" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Exercícios & Jogos Recomendados
              </h2>
              <p className="text-xs text-muted-foreground">
                Módulos interativos para treino articulatório, auditivo e cognitivo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleActionClick('Catálogo de jogos expandido.')}
              className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            >
              <span>Explorar catálogo</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SAMPLE_GAMES.map((game) => (
              <GameCard
                key={game.id}
                title={game.title}
                itemsCount={game.itemsCount}
                unitLabel={game.unitLabel}
                category={game.category}
                theme={game.theme}
                difficultyBadge={game.difficultyBadge}
                onPlay={() => {
                  if (selectedPatientContext) {
                    handleActionClick(
                      `Partida iniciada no prontuário de ${selectedPatientContext.nome}: "${game.title}"`
                    );
                  } else {
                    handleActionClick(
                      `Partida iniciada em modo teste do fonoaudiólogo: "${game.title}"`
                    );
                  }
                }}
              />
            ))}
          </div>
        </section>
          </>
        )}

        {/* 6. TELA DE EXERCÍCIOS & JOGOS (QUANDO CLICADA NA SIDEBAR) */}
        {activeNav === 'lessons' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Catálogo Clínico de Jogos & Exercícios
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedPatientContext
                    ? `Atendimento presencial ativo com ${selectedPatientContext.nome}. Os dados serão salvos no prontuário.`
                    : 'Modo teste livre do fonoaudiólogo. Os dados são salvos em seu histórico de profissional.'}
                </p>
              </div>

              {selectedPatientContext && (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-semibold">
                    Paciente: <strong>{selectedPatientContext.nome}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectPatientContext(null)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground font-semibold"
                  >
                    Desmarcar
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {SAMPLE_GAMES.map((game) => (
                <GameCard
                  key={game.id}
                  title={game.title}
                  itemsCount={game.itemsCount}
                  unitLabel={game.unitLabel}
                  category={game.category}
                  theme={game.theme}
                  difficultyBadge={game.difficultyBadge}
                  onPlay={() => {
                    if (selectedPatientContext) {
                      handleActionClick(
                        `Executando "${game.title}" com o paciente ${selectedPatientContext.nome}!`
                      );
                    } else {
                      handleActionClick(
                        `Modo Livre: testando "${game.title}" sob seu perfil profissional.`
                      );
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
