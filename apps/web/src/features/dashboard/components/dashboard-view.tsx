import * as React from 'react';
import {
  Home,
  BookOpen,
  Calendar,
  Send,
  ShoppingBag,
  User,
  LogOut,
  Bell,
  Rocket,
  CheckCircle2,
  LayoutGrid,
  Trophy,
  HelpCircle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { GameCard, type GameCategoryTheme } from '@/components/ui/game-card';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, active: true },
  { id: 'lessons', label: 'Lessons', icon: BookOpen },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'inbox', label: 'Inbox', icon: Send },
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'logout', label: 'Logout', icon: LogOut },
];

interface LessonGame {
  id: string;
  title: string;
  itemsCount: number;
  unitLabel: string;
  theme: GameCategoryTheme;
  difficultyBadge: string;
}

const SAMPLE_GAMES: LessonGame[] = [
  {
    id: '1',
    title: 'A-E-I-O-U (Vogais)',
    itemsCount: 10,
    unitLabel: 'Exercícios',
    theme: 'rose',
    difficultyBadge: 'Nível Fácil',
  },
  {
    id: '2',
    title: 'Identificação de Sons e Cores',
    itemsCount: 8,
    unitLabel: 'Vídeos',
    theme: 'amber',
    difficultyBadge: 'Nível Fácil',
  },
  {
    id: '3',
    title: 'Raciocínio & Números Sonoros',
    itemsCount: 12,
    unitLabel: 'Desafios',
    theme: 'blue',
    difficultyBadge: 'Nível Médio',
  },
  {
    id: '4',
    title: 'Super Formas e Percepção',
    itemsCount: 6,
    unitLabel: 'Exercícios',
    theme: 'purple',
    difficultyBadge: 'Nível Difícil',
  },
  {
    id: '5',
    title: 'Consciência Fonológica dos Animais',
    itemsCount: 9,
    unitLabel: 'Vídeos',
    theme: 'emerald',
    difficultyBadge: 'Nível Fácil',
  },
  {
    id: '6',
    title: 'Frutas e Articulação Vocal',
    itemsCount: 7,
    unitLabel: 'Exercícios',
    theme: 'rose',
    difficultyBadge: 'Nível Médio',
  },
  {
    id: '7',
    title: 'Expressões Faciais e Emoções',
    itemsCount: 11,
    unitLabel: 'Práticas',
    theme: 'purple',
    difficultyBadge: 'Nível Médio',
  },
  {
    id: '8',
    title: 'Motricidade Orofacial & Respiração',
    itemsCount: 14,
    unitLabel: 'Exercícios',
    theme: 'blue',
    difficultyBadge: 'Nível Difícil',
  },
];

export const DashboardView: React.FC = () => {
  const [activeNav, setActiveNav] = React.useState('home');
  const [activeFeedback, setActiveFeedback] = React.useState<string | null>(null);

  const handleCardClick = (title: string) => {
    setActiveFeedback(`Você clicou em "${title}". Efeito hover e interação confirmados!`);
    setTimeout(() => setActiveFeedback(null), 3500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans antialiased">
      {/* 1. SIDEBAR LATERAL (Design System Tokens) */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col justify-between p-5 shrink-0 hidden md:flex">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-10 h-10 rounded-2xl bg-brand-amber text-brand-amber-foreground flex items-center justify-center font-extrabold shadow-xs text-lg">
              FG
            </div>
            <div>
              <span className="font-extrabold text-lg text-foreground tracking-tight block leading-tight">
                FonoGames
              </span>
              <span className="font-semibold text-xs text-primary tracking-wider uppercase block">
                Plataforma Clínica
              </span>
            </div>
          </div>

          {/* Menu de Navegação */}
          <nav className="space-y-1.5" aria-label="Menu principal">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200',
                    isSelected
                      ? 'bg-sidebar-active text-sidebar-active-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-transform duration-200',
                      isSelected ? 'scale-105' : 'opacity-80',
                    )}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Card de Destaque Clínico Inferior */}
        <div className="relative rounded-3xl bg-sidebar-card border border-sidebar-card-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-xs text-foreground">Edição Pro Clínica</h4>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Exercícios personalizados, relatórios de evolução clínica e acompanhamento fonoaudiológico avançado.
          </p>
          <button
            type="button"
            className="w-full py-2.5 px-3 rounded-xl bg-brand-amber text-brand-amber-foreground font-bold text-xs shadow-md hover:brightness-105 active:scale-98 transition-all"
          >
            Experimentar 14 dias
          </button>
        </div>
      </aside>

      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col p-6 lg:p-10 space-y-8 overflow-y-auto">
        {/* Top Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Overview</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Acompanhamento de desempenho e catálogo de jogos fonoaudiológicos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative flex items-center gap-2 px-4 py-2 rounded-2xl bg-card border border-border text-sm font-semibold text-foreground shadow-xs hover:bg-muted active:scale-98 transition-all"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span>Notifications</span>
              <span className="w-5 h-5 rounded-full bg-game-rose-from text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
            </button>
          </div>
        </header>

        {/* Notificação / Feedback de Interação */}
        {activeFeedback && (
          <div
            role="status"
            className="p-3.5 rounded-2xl bg-accent border border-primary/20 text-accent-foreground text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {activeFeedback}
          </div>
        )}

        {/* 4 KPIs de Resumo usando Tokens Semânticos */}
        <section
          aria-label="Métricas de progresso"
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {/* Card 1 */}
          <div className="bg-card rounded-3xl p-5 border border-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-foreground">1</span>
              <div className="w-9 h-9 rounded-2xl bg-game-rose-subtle text-game-rose-foreground flex items-center justify-center">
                <Rocket className="w-5 h-5" />
              </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground mt-3">
              Lesson(s) in progress
            </span>
          </div>

          {/* Card 2 */}
          <div className="bg-card rounded-3xl p-5 border border-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-foreground">10</span>
              <div className="w-9 h-9 rounded-2xl bg-game-emerald-subtle text-game-emerald-foreground flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground mt-3">Lessons completed</span>
          </div>

          {/* Card 3 */}
          <div className="bg-card rounded-3xl p-5 border border-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-foreground">4</span>
              <div className="w-9 h-9 rounded-2xl bg-game-purple-subtle text-game-purple-foreground flex items-center justify-center">
                <LayoutGrid className="w-5 h-5" />
              </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground mt-3">Categories completed</span>
          </div>

          {/* Card 4 */}
          <div className="bg-card rounded-3xl p-5 border border-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-foreground">5</span>
              <div className="w-9 h-9 rounded-2xl bg-game-amber-subtle text-game-amber-foreground flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground mt-3">Achievements</span>
          </div>
        </section>

        {/* 3. SEÇÃO DE JOGOS & LIÇÕES COM O NOVO COMPONENTE GAMECARD */}
        <section aria-label="Catálogo de Lições" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Lessons & Jogos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Passe o cursor sobre os cards para experimentar o efeito de elevação, zoom e foco no botão de ação.
              </p>
            </div>
          </div>

          {/* Grid de Cards com Hover Effect */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {SAMPLE_GAMES.map((game) => (
              <GameCard
                key={game.id}
                title={game.title}
                itemsCount={game.itemsCount}
                unitLabel={game.unitLabel}
                theme={game.theme}
                difficultyBadge={game.difficultyBadge}
                onPlay={() => handleCardClick(game.title)}
              />
            ))}
          </div>
        </section>

        {/* Botão Flutuante de Ajuda */}
        <div className="fixed bottom-6 right-6">
          <button
            type="button"
            aria-label="Ajuda e Suporte"
            className="w-12 h-12 rounded-full bg-brand-teal hover:bg-brand-teal-hover text-brand-teal-foreground flex items-center justify-center shadow-lg shadow-brand-teal/30 hover:scale-110 active:scale-95 transition-all"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </div>
      </main>
    </div>
  );
};
