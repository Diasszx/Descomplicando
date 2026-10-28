import * as React from 'react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { CreateSponsorInput } from '@fono/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, UserCheck } from 'lucide-react';

export interface StakeholderFieldItemProps {
  index: number;
  register: UseFormRegister<CreateSponsorInput>;
  errors?: FieldErrors<CreateSponsorInput>;
  onRemove: () => void;
  isRemoveDisabled: boolean;
}

export const StakeholderFieldItem: React.FC<StakeholderFieldItemProps> = ({
  index,
  register,
  errors,
  onRemove,
  isRemoveDisabled,
}) => {
  const stakeholderErrors = errors?.stakeholders?.[index];

  return (
    <div className="relative rounded-lg border border-border/80 bg-card p-4 shadow-sm transition-all hover:border-primary/40">
      <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {index + 1}
          </span>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            Contato / Stakeholder #{index + 1}
          </h4>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={isRemoveDisabled}
          aria-label={`Remover stakeholder ${index + 1}`}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          <span className="text-xs">Remover</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome do Stakeholder */}
        <div className="space-y-1.5">
          <Label htmlFor={`stakeholders.${index}.name`} requiredIndicator>
            Nome do Contato
          </Label>
          <Input
            id={`stakeholders.${index}.name`}
            placeholder="Ex: Dra. Mariana Costa"
            aria-invalid={Boolean(stakeholderErrors?.name)}
            aria-describedby={stakeholderErrors?.name ? `stakeholder-${index}-name-error` : undefined}
            {...register(`stakeholders.${index}.name` as const)}
          />
          {stakeholderErrors?.name && (
            <p
              id={`stakeholder-${index}-name-error`}
              role="alert"
              className="text-xs font-medium text-destructive mt-1"
            >
              {stakeholderErrors.name.message}
            </p>
          )}
        </div>

        {/* Cargo / Função */}
        <div className="space-y-1.5">
          <Label htmlFor={`stakeholders.${index}.role`} requiredIndicator>
            Cargo / Função
          </Label>
          <Input
            id={`stakeholders.${index}.role`}
            placeholder="Ex: Coordenadora de Projetos / Fonoaudióloga"
            aria-invalid={Boolean(stakeholderErrors?.role)}
            aria-describedby={stakeholderErrors?.role ? `stakeholder-${index}-role-error` : undefined}
            {...register(`stakeholders.${index}.role` as const)}
          />
          {stakeholderErrors?.role && (
            <p
              id={`stakeholder-${index}-role-error`}
              role="alert"
              className="text-xs font-medium text-destructive mt-1"
            >
              {stakeholderErrors.role.message}
            </p>
          )}
        </div>

        {/* E-mail de Contato */}
        <div className="space-y-1.5">
          <Label htmlFor={`stakeholders.${index}.email`}>
            E-mail de Contato
          </Label>
          <Input
            id={`stakeholders.${index}.email`}
            type="email"
            placeholder="contato@empresa.com"
            aria-invalid={Boolean(stakeholderErrors?.email)}
            aria-describedby={stakeholderErrors?.email ? `stakeholder-${index}-email-error` : undefined}
            {...register(`stakeholders.${index}.email` as const)}
          />
          {stakeholderErrors?.email && (
            <p
              id={`stakeholder-${index}-email-error`}
              role="alert"
              className="text-xs font-medium text-destructive mt-1"
            >
              {stakeholderErrors.email.message}
            </p>
          )}
        </div>

        {/* Telefone de Contato */}
        <div className="space-y-1.5">
          <Label htmlFor={`stakeholders.${index}.phone`}>
            Telefone / WhatsApp
          </Label>
          <Input
            id={`stakeholders.${index}.phone`}
            type="tel"
            placeholder="(11) 99999-9999"
            aria-invalid={Boolean(stakeholderErrors?.phone)}
            aria-describedby={stakeholderErrors?.phone ? `stakeholder-${index}-phone-error` : undefined}
            {...register(`stakeholders.${index}.phone` as const)}
          />
          {stakeholderErrors?.phone && (
            <p
              id={`stakeholder-${index}-phone-error`}
              role="alert"
              className="text-xs font-medium text-destructive mt-1"
            >
              {stakeholderErrors.phone.message}
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground italic">
        * Obrigatório informar ao menos um canal de contato (e-mail ou telefone).
      </p>
    </div>
  );
};
