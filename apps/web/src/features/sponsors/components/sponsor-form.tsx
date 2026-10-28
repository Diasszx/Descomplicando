import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createSponsorSchema,
  type CreateSponsorInput,
} from '@fono/shared';
import { useCreateSponsor } from '../hooks/use-create-sponsor';
import { StakeholderFieldItem } from './stakeholder-field-item';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const SponsorForm: React.FC = () => {
  const {
    mutate: createSponsor,
    isPending,
    isSuccess,
    isError,
    error,
    reset: resetMutation,
  } = useCreateSponsor();

  const {
    register,
    control,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<CreateSponsorInput>({
    resolver: zodResolver(createSponsorSchema),
    defaultValues: {
      name: '',
      document: '',
      notes: '',
      stakeholders: [
        {
          name: '',
          role: '',
          email: '',
          phone: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'stakeholders',
  });

  const onSubmit = (data: CreateSponsorInput) => {
    createSponsor(data, {
      onSuccess: () => {
        resetForm();
      },
    });
  };

  const handleAddStakeholder = () => {
    append({
      name: '',
      role: '',
      email: '',
      phone: '',
    });
  };

  return (
    <Card className="w-full max-w-3xl shadow-md border-border/80">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Cadastrar Patrocinador</CardTitle>
            <CardDescription>
              Cadastre as informações da instituição parceira e os stakeholders para contato direto.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-6">
          {/* Alerta de Sucesso */}
          {isSuccess && (
            <div
              role="status"
              className="flex items-center justify-between rounded-md bg-emerald-500/10 p-4 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">Patrocinador cadastrado com sucesso!</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => resetMutation()}
                className="text-xs hover:bg-emerald-500/20"
              >
                Novo Cadastro
              </Button>
            </div>
          )}

          {/* Alerta de Erro de API */}
          {isError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md bg-destructive/10 p-4 border border-destructive/20 text-destructive text-sm"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>
                {error instanceof Error
                  ? error.message
                  : 'Ocorreu um erro ao cadastrar o patrocinador. Tente novamente.'}
              </span>
            </div>
          )}

          {/* Dados do Patrocinador */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Dados da Organização
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sponsor-name" requiredIndicator>
                  Nome da Empresa / Instituição
                </Label>
                <Input
                  id="sponsor-name"
                  placeholder="Ex: Fundação Saúde & Vida"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'sponsor-name-error' : undefined}
                  {...register('name')}
                />
                {errors.name && (
                  <p id="sponsor-name-error" role="alert" className="text-xs font-medium text-destructive mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sponsor-document">CNPJ ou Documento de Registro</Label>
                <Input
                  id="sponsor-document"
                  placeholder="00.000.000/0000-00"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.document)}
                  {...register('document')}
                />
                {errors.document && (
                  <p role="alert" className="text-xs font-medium text-destructive mt-1">
                    {errors.document.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stakeholders (useFieldArray) */}
          <div className="space-y-4 pt-4 border-t border-border/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Stakeholders & Contatos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Adicione ao menos um responsável da instituição com e-mail ou telefone válido.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddStakeholder}
                disabled={isPending}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Stakeholder
              </Button>
            </div>

            {/* Erro global no array de stakeholders (se houver menos de 1) */}
            {errors.stakeholders?.message && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {errors.stakeholders.message}
              </p>
            )}

            {/* Lista Dinâmica de Stakeholders */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <StakeholderFieldItem
                  key={field.id}
                  index={index}
                  register={register}
                  errors={errors}
                  onRemove={() => remove(index)}
                  isRemoveDisabled={fields.length <= 1 || isPending}
                />
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 pt-6 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => resetForm()}
          >
            Limpar
          </Button>

          <Button type="submit" disabled={isPending} className="min-w-[140px]">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar Patrocinador'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
