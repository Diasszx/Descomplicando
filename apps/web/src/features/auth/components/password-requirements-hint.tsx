import { CheckCircle2, Circle } from 'lucide-react';
import { PASSWORD_MIN_LENGTH } from '@fono/shared';
import { cn } from '@/lib/utils';

export interface PasswordRequirementsHintProps {
  password: string;
  id?: string;
}

interface RequirementItem {
  id: string;
  label: string;
  met: boolean;
}

export function PasswordRequirementsHint({ password, id }: PasswordRequirementsHintProps) {
  const requirements: RequirementItem[] = [
    {
      id: 'min-length',
      label: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'uppercase',
      label: 'Pelo menos uma letra maiúscula (A–Z)',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'Pelo menos uma letra minúscula (a–z)',
      met: /[a-z]/.test(password),
    },
  ];

  return (
    <div
      id={id}
      className="rounded-2xl border border-border bg-muted/50 p-3.5 space-y-2"
      aria-live="polite"
    >
      <p className="text-xs font-semibold text-foreground">Requisitos da senha:</p>
      <ul className="space-y-1.5">
        {requirements.map((item) => (
          <li
            key={item.id}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors',
              item.met ? 'text-status-easy font-semibold' : 'text-muted-foreground',
            )}
          >
            {item.met ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="w-4 h-4 shrink-0 opacity-60" aria-hidden="true" />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
