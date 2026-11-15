---
name: "fono-ui-design-system"
description: "Guia canônico da Identidade Visual e Design System oficial da FonoGames. Define tokens semânticos (CSS variables e Tailwind), proíbe cores hardcodadas, padroniza sidebar, layout dashboard e o componente GameCard com micro-interações de hover."
compatibility: "React 18+, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons"
metadata:
  author: "fono-frontend-specialist"
  version: "2.0.0"
---

# FonoGames Design System & Identidade Visual

Este documento é a especificação canônica do **Design System** da **FonoGames** (Web e Mobile). Todos os agentes e engenheiros de front-end **DEVEM** seguir rigorosamente estas diretrizes ao prototipar, criar ou refatorar qualquer componente visual, tela ou fluxo.

---

## 1. Princípios de Engenharia de UI & Guardrails de Design

> [!IMPORTANT]
> **REGRA DE OURO — ZERO CORES HARDCODADAS:**
> É expressamente **PROIBIDO** utilizar cores com valores hexadecimais literais (`#F8FAFC`, `#0D9488`, etc.), códigos RGB soltos ou classes utilitárias arbitrárias (`bg-[#...]`) no JSX/Tailwind.
> Todo componente DEVE consumir exclusivamente os **tokens semânticos** declarados em `src/index.css` e mapeados em `tailwind.config.js`.

* **Consistência Semântica:** A interface responde automaticamente a temas (Light/Dark mode) através de variáveis CSS centralizadas.
* **Sensação Geral:** Rigor clínico fonoaudiológico aliado a uma atmosfera estimulante, lúdica e acolhedora.
* **Bordas e Formas:** Cantos arredondados padronizados (`rounded-3xl` para cards e containers principais, `rounded-2xl` para banners internos e pílulas).
* **Acessibilidade Inegociável:** Conformidade estrita com **WCAG AA** (contraste mínimo de 4.5:1 para texto normal, anéis de foco visíveis `focus-visible:ring-2 focus-visible:ring-ring` e navegação integral por teclado `Tab`, `Enter`, `Space`).
* **Plataforma 100% Livre de Anúncios (Zero Ads):** A plataforma não possui publicidade. É PROIBIDO criar componentes ou textos com "sem anúncios" / "no ads". O valor de planos Pro foca estritamente em recursos clínicos (relatórios com IA, prontuários, planos terapêuticos).

---

## 2. Mapa Oficial de Design Tokens (Tailwind & CSS Variables)

Todos os tokens são declarados como HSL em `apps/web/src/index.css` e expostos como classes utilitárias no `tailwind.config.js`:

| Categoria | Variável CSS (`index.css`) | Classe Tailwind | Finalidade de Uso |
| :--- | :--- | :--- | :--- |
| **Base** | `--background` / `--foreground` | `bg-background`, `text-foreground` | Fundo da aplicação e tipografia base |
| **Superfície** | `--card` / `--card-foreground` | `bg-card`, `text-card-foreground` | Cartões, containers e painéis modulares |
| **Bordas** | `--border` / `--ring` | `border-border`, `ring-ring` | Divisórias sutis e anel de foco acessível |
| **Muted** | `--muted` / `--muted-foreground` | `bg-muted`, `text-muted-foreground` | Subtítulos, metadados e fundos inativos |
| **Brand Teal** | `--brand-teal` / `--brand-teal-hover` | `bg-brand-teal`, `hover:bg-brand-teal-hover` | Botão de Play, ações clínicas principais |
| **Brand Amber** | `--brand-amber` | `bg-brand-amber`, `text-brand-amber-foreground` | Logo institucional, chamadas Pro |
| **Sidebar Base**| `--sidebar-bg` / `--sidebar-border`| `bg-sidebar`, `border-sidebar-border` | Estrutura do menu lateral |
| **Sidebar Ativo**| `--sidebar-active-bg` / `--foreground` | `bg-sidebar-active`, `text-sidebar-active-foreground` | Pílula arredondada do item ativo |
| **Sidebar Card**| `--sidebar-card-bg` / `--border`| `bg-sidebar-card`, `border-sidebar-card-border` | Card inferior de destaque clínico |
| **Tema Rosa** | `--game-rose-from` / `--to` | `from-game-rose-from to-game-rose-to` | Banner de Linguagem e Articulação |
| **Tema Esmeralda**| `--game-emerald-from` / `--to` | `from-game-emerald-from to-game-emerald-to` | Banner de Voz e Identificação Sonora |
| **Tema Roxo** | `--game-purple-from` / `--to` | `from-game-purple-from to-game-purple-to` | Banner de Consciência Fonológica |
| **Tema Azul** | `--game-blue-from` / `--to` | `from-game-blue-from to-game-blue-to` | Banner de Treino Auditivo e Números |
| **Tema Âmbar** | `--game-amber-from` / `--to` | `from-game-amber-from to-game-amber-to` | Banner de Motricidade Orofacial |
| **Ícones Tema**| `--game-[cor]-subtle` / `foreground` | `bg-game-rose-subtle text-game-rose-foreground` | Miniaturas de métricas/KPIs |
| **Status Fácil**| `--status-easy` | `text-status-easy` | Badge de dificuldade Nível Fácil |
| **Status Médio**| `--status-medium` | `text-status-medium` | Badge de dificuldade Nível Médio |
| **Status Difícil**| `--status-hard` | `text-status-hard` | Badge de dificuldade Nível Difícil |

---

## 3. Tipografia e Raios de Borda

* **Fonte Canônica:** `Inter`, sans-serif.
* **Títulos de Página (Overview):** `text-3xl font-extrabold tracking-tight text-foreground`.
* **Títulos de Cards:** `text-base font-bold text-card-foreground`.
* **Metadados:** `text-xs font-medium text-muted-foreground`.
* **Tokens de Borda:**
  * Cartões externos: `rounded-3xl` (`1.5rem` / 24px).
  * Banners internos e botões modulares: `rounded-2xl` (`1rem` / 16px).
  * Pílulas e ações circulares: `rounded-full` ou `rounded-xl`.

---

## 4. Estrutura de Layout do Dashboard

1. **Sidebar Lateral:**
   * Fundo semântico `bg-sidebar` e divisória `border-r border-sidebar-border`.
   * Logo com token `bg-brand-amber`.
   * Navegação com pílulas: item ativo com `bg-sidebar-active text-sidebar-active-foreground`, inativos com `text-muted-foreground hover:bg-muted hover:text-foreground`.
   * Card inferior de destaque clínico: `bg-sidebar-card border-sidebar-card-border` com botão `bg-brand-amber`.
2. **Área Principal:**
   * Fundo geral `bg-background text-foreground`.
   * Header com título e botão de notificações (`bg-card border-border`).
   * 4 KPIs horizontais (`bg-card border-border`) com ícones semânticos (`bg-game-*-subtle text-game-*-foreground`).
   * Grid de Jogos responsivo: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6`.

---

## 5. Especificação do Card de Jogos (`GameCard`)

### Anatomia e Micro-interações de Hover
1. **Container Externo:**
   * Classes: `bg-card text-card-foreground rounded-3xl border border-border shadow-xs`.
   * Hover: `hover:-translate-y-2 hover:shadow-xl hover:shadow-muted/60 transition-all duration-300 ease-out`.
   * Foco acessível: `focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
2. **Banner Superior Ilustrado:**
   * Contêiner: `relative w-full h-44 rounded-2xl overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br`.
   * Gradientes aplicados exclusivamente via tokens semânticos:
     * `rose`: `from-game-rose-from to-game-rose-to`
     * `emerald`: `from-game-emerald-from to-game-emerald-to`
     * `purple`: `from-game-purple-from to-game-purple-to`
     * `blue`: `from-game-blue-from to-game-blue-to`
     * `amber`: `from-game-amber-from to-game-amber-to`
   * Ilustração: `group-hover:scale-108 transition-transform duration-300 ease-out`.
3. **Rodapé com Botão de Ação:**
   * Título: `font-bold text-base text-card-foreground line-clamp-1 group-hover:text-primary transition-colors`.
   * Metadados: `text-xs font-medium text-muted-foreground`.
   * Botão de Play: `w-8 h-8 rounded-full bg-brand-teal text-brand-teal-foreground group-hover:scale-115 group-hover:bg-brand-teal-hover transition-all duration-200`.

---

## 6. Implementação de Referência (React + TypeScript)

```tsx
import * as React from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GameCategoryTheme = 'rose' | 'emerald' | 'purple' | 'blue' | 'amber';

export interface GameCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  itemsCount: number;
  unitLabel?: string;
  theme?: GameCategoryTheme;
  imageUrl?: string;
  imageAlt?: string;
  difficultyBadge?: string;
  onPlay?: () => void;
}

const THEME_GRADIENTS: Record<GameCategoryTheme, string> = {
  rose: 'from-game-rose-from to-game-rose-to',
  emerald: 'from-game-emerald-from to-game-emerald-to',
  purple: 'from-game-purple-from to-game-purple-to',
  blue: 'from-game-blue-from to-game-blue-to',
  amber: 'from-game-amber-from to-game-amber-to',
};

export const GameCard = React.forwardRef<HTMLDivElement, GameCardProps>(
  (
    {
      title,
      itemsCount,
      unitLabel = 'Exercícios',
      theme = 'blue',
      imageUrl,
      imageAlt = '',
      difficultyBadge,
      onPlay,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const handleAction = () => {
      if (onPlay) {
        onPlay();
      } else if (onClick) {
        (onClick as () => void)();
      }
    };

    return (
      <article
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={`Iniciar ${title}, ${itemsCount} ${unitLabel}`}
        onClick={handleAction}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleAction();
          }
        }}
        className={cn(
          'group relative flex flex-col justify-between p-3 bg-card text-card-foreground rounded-3xl border border-border shadow-xs',
          'hover:-translate-y-2 hover:shadow-xl hover:shadow-muted/60',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'cursor-pointer transition-all duration-300 ease-out select-none',
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'relative w-full h-44 rounded-2xl overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br',
            THEME_GRADIENTS[theme],
          )}
        >
          {difficultyBadge && (
            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-card/90 text-card-foreground shadow-xs backdrop-blur-xs">
              {difficultyBadge}
            </span>
          )}

          {imageUrl ? (
            <img
              src={imageUrl}
              alt={imageAlt || title}
              className="w-full h-full object-contain drop-shadow-md group-hover:scale-108 transition-transform duration-300 ease-out pointer-events-none"
              loading="lazy"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold group-hover:scale-110 transition-transform duration-300">
              {title.charAt(0)}
            </div>
          )}
        </div>

        <div className="pt-3 pb-1 px-1">
          <h3 className="font-bold text-base text-card-foreground line-clamp-1 group-hover:text-primary transition-colors duration-200">
            {title}
          </h3>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {itemsCount} {unitLabel}
            </span>

            <div
              className={cn(
                'w-8 h-8 rounded-full bg-brand-teal text-brand-teal-foreground flex items-center justify-center shadow-md shadow-brand-teal/20',
                'group-hover:scale-115 group-hover:bg-brand-teal-hover active:scale-95 transition-all duration-200',
              )}
            >
              <Play className="w-4 h-4 fill-current translate-x-0.5" aria-hidden="true" />
            </div>
          </div>
        </div>
      </article>
    );
  },
);

GameCard.displayName = 'GameCard';
```

---

## 7. Checklist de Conformidade do Design System

- [ ] **ZERO HARDCODED COLORS:** Nenhuma cor em hexadecimal (`#...`) ou RGB solta no código. Todos os elementos usam tokens semânticos (`bg-background`, `bg-sidebar`, `bg-brand-teal`, `from-game-*-from`, etc.).
- [ ] **SEM ANÚNCIOS:** Nenhum texto ou elemento sobre "remover propagandas" ou "no ads".
- [ ] **MICRO-INTERAÇÕES:** O `GameCard` implementa elevação suave (`-translate-y-2`), expansão de sombra tridimensional, leve zoom na ilustração e highlight no botão de Play.
- [ ] **ACESSIBILIDADE:** Foco visível via `focus-visible:ring-ring`, suporte a navegação por teclado (`Tab`, `Enter`, `Space`) e contraste WCAG AA.
- [ ] **DARK MODE COMPLIANT:** O componente responde automaticamente às classes de tema sem quebras visuais.
