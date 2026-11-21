import * as React from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GameCategoryTheme = 'rose' | 'emerald' | 'purple' | 'blue' | 'amber';

export interface GameCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
  title: string;
  itemsCount: number;
  unitLabel?: string;
  category?: string;
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
      category = 'Fonoaudiologia',
      theme = 'emerald',
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
          'group relative flex flex-col justify-between p-4 bg-card text-card-foreground rounded-2xl border border-border shadow-xs',
          'hover:-translate-y-1.5 hover:shadow-md hover:border-primary/50',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'cursor-pointer transition-all duration-300 ease-out select-none',
          className,
        )}
        {...props}
      >
        {/* Banner Ilustrado Superior */}
        <div
          className={cn(
            'relative w-full h-36 rounded-xl overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br border border-border/50 shadow-xs',
            THEME_GRADIENTS[theme],
          )}
        >
          {difficultyBadge && (
            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-card/90 text-card-foreground border border-border/60 shadow-xs backdrop-blur-xs">
              {difficultyBadge}
            </span>
          )}

          {imageUrl ? (
            <img
              src={imageUrl}
              alt={imageAlt || title}
              className="w-full h-full object-contain drop-shadow-sm group-hover:scale-108 transition-transform duration-300 ease-out pointer-events-none"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-foreground/20 text-primary-foreground flex items-center justify-center text-2xl font-bold group-hover:scale-110 transition-transform duration-300">
              {title.charAt(0)}
            </div>
          )}
        </div>

        {/* Informações e Botão de Ação */}
        <div className="pt-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {category}
          </div>
          <h3 className="font-bold text-base text-card-foreground line-clamp-1 group-hover:text-primary transition-colors duration-200 mt-0.5">
            {title}
          </h3>

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40">
            <span className="text-xs font-medium text-foreground/80">
              {itemsCount} {unitLabel}
            </span>

            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className={cn(
                'w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs',
                'group-hover:bg-primary-hover group-hover:scale-105 active:scale-95 transition-all duration-200',
              )}
            >
              <Play className="w-4 h-4 fill-current translate-x-0.5" />
            </button>
          </div>
        </div>
      </article>
    );
  },
);

GameCard.displayName = 'GameCard';
