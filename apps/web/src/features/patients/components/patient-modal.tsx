import * as React from 'react';
import {
  X,
  UserPlus,
  Gamepad2,
  Lock,
  Mail,
  Sparkles,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  AVAILABLE_GAMES_CATALOG,
  type Patient,
  type AssignedGame,
  type AvailableGameCatalogItem,
} from '../types';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [nome, setNome] = React.useState('');
  const [dataNascimento, setDataNascimento] = React.useState('');
  const [faixaEtaria, setFaixaEtaria] = React.useState<Patient['faixa_etaria']>('Escolar (6-9)');
  const [email, setEmail] = React.useState('');
  const [senhaAcesso, setSenhaAcesso] = React.useState('');
  const [telefoneResponsavel, setTelefoneResponsavel] = React.useState('');
  const [areaTerapeutica, setAreaTerapeutica] = React.useState('Linguagem e Fala');
  const [condicaoClinica, setCondicaoClinica] = React.useState('');
  const [objetivoAtivo, setObjetivoAtivo] = React.useState('');
  const [selectedGameIds, setSelectedGameIds] = React.useState<string[]>(['game-1']);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Auto-gera credenciais sugeridas com base no nome
  React.useEffect(() => {
    if (nome.trim().length > 3) {
      const cleanName = nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '.');
      setEmail(`${cleanName}@paciente.fonogames.com`);
      setSenhaAcesso((prev) => prev || `Fono@${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [nome]);

  // Calcula automaticamente a faixa etária ao informar data de nascimento
  const handleDateChange = (val: string) => {
    setDataNascimento(val);
    if (!val) return;
    const birth = new Date(val);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    if (age <= 5) setFaixaEtaria('Infantil I (3-5)');
    else if (age <= 9) setFaixaEtaria('Escolar (6-9)');
    else if (age <= 14) setFaixaEtaria('Juvenil (10-14)');
    else setFaixaEtaria('Adolescente/Adulto (15+)');
  };

  const toggleGame = (gameId: string) => {
    setSelectedGameIds((prev) =>
      prev.includes(gameId)
        ? prev.filter((id) => id !== gameId)
        : [...prev, gameId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nome.trim()) newErrors.nome = 'Nome do paciente é obrigatório';
    if (!dataNascimento) newErrors.dataNascimento = 'Data de nascimento é obrigatória';
    if (!email.trim()) newErrors.email = 'E-mail para login do paciente é obrigatório';
    if (!senhaAcesso.trim()) newErrors.senhaAcesso = 'Senha temporária de acesso é obrigatória';
    if (!condicaoClinica.trim()) newErrors.condicaoClinica = 'Diagnóstico ou queixa é obrigatório';
    if (!objetivoAtivo.trim()) newErrors.objetivoAtivo = 'Objetivo clínico ativo é obrigatório';
    if (selectedGameIds.length === 0) {
      newErrors.games = 'Selecione pelo menos um jogo para liberar no plano terapêutico inicial';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const assignedGames: AssignedGame[] = selectedGameIds.map((id) => {
      const found = AVAILABLE_GAMES_CATALOG.find((g: AvailableGameCatalogItem) => g.id === id);
      return {
        id,
        nome: found ? found.nome : 'Jogo Clínico',
        categoria: found ? found.habilidade : 'Habilidade',
        status: 'ATIVO',
        fasesLiberadas: 3,
      };
    });

    const birth = new Date(dataNascimento);
    const now = new Date();
    const calculatedAge = now.getFullYear() - birth.getFullYear();

    const newPatient: Patient = {
      id: `p-${Date.now()}`,
      usuario_id: `usr-${Date.now()}`,
      nome: nome.trim(),
      email: email.trim(),
      telefoneResponsavel: telefoneResponsavel.trim() || undefined,
      data_nascimento: dataNascimento,
      idadeCalculada: `${calculatedAge} anos`,
      faixa_etaria: faixaEtaria,
      condicaoClinica: condicaoClinica.trim(),
      objetivoAtivo: objetivoAtivo.trim(),
      areaTerapeutica,
      ultimoAtendimento: 'Recém cadastrado',
      progressoPercent: 0,
      jogosPrescritos: assignedGames,
      statusPlano: 'ATIVO',
    };

    onSave(newPatient);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-background border border-border w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-foreground">
                Cadastrar Novo Paciente & Prescrição
              </h2>
              <p className="text-xs text-muted-foreground">
                Gere o prontuário, as credenciais de acesso remoto e libere os jogos iniciais.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body com scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seção 1: Dados do Prontuário */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>1. Dados Pessoais & Prontuário Clínico (Tabela PACIENTES)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Pedro Henrique de Souza"
                  className="w-full h-10 px-3 text-sm rounded-xl bg-card-patient border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                />
                {errors.nome && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.nome}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Telefone / WhatsApp do Responsável
                </label>
                <input
                  type="text"
                  value={telefoneResponsavel}
                  onChange={(e) => setTelefoneResponsavel(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full h-10 px-3 text-sm rounded-xl bg-card-patient border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Data de Nascimento *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-xl bg-card-patient border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                  />
                </div>
                {errors.dataNascimento && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.dataNascimento}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Faixa Etária (Classificação Automática)
                </label>
                <select
                  value={faixaEtaria}
                  onChange={(e) => setFaixaEtaria(e.target.value as Patient['faixa_etaria'])}
                  className="w-full h-10 px-3 text-sm rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                >
                  <option value="Infantil I (3-5)">Infantil I (3 a 5 anos)</option>
                  <option value="Escolar (6-9)">Escolar (6 a 9 anos)</option>
                  <option value="Juvenil (10-14)">Juvenil (10 a 14 anos)</option>
                  <option value="Adolescente/Adulto (15+)">Adolescente/Adulto (15+)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seção 2: Credenciais de Acesso Remoto (USUARIOS) */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <Lock className="w-4 h-4" />
              <span>2. Credenciais de Acesso para Casa / Remoto (RF03 / Tabela USUARIOS)</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O paciente ou responsável utilizará estas credenciais para fazer login no portal do paciente e jogar em casa.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  E-mail de Acesso Gerado *
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="paciente@paciente.fonogames.com"
                    className="w-full h-10 pl-9 pr-3 text-sm rounded-xl bg-card-patient border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-mono text-xs"
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Senha Temporária de Acesso *
                </label>
                <input
                  type="text"
                  value={senhaAcesso}
                  onChange={(e) => setSenhaAcesso(e.target.value)}
                  placeholder="Senha do paciente"
                  className="w-full h-10 px-3 text-sm rounded-xl bg-card-patient border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-mono text-xs"
                />
                {errors.senhaAcesso && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.senhaAcesso}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Seção 3: Diagnóstico e Metas Clínicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>3. Matriz Terapêutica & Diagnóstico (Área & Objetivo Clínico)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Área Terapêutica de Foco
                </label>
                <select
                  value={areaTerapeutica}
                  onChange={(e) => setAreaTerapeutica(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                >
                  <option value="Linguagem e Fala">Linguagem e Fala</option>
                  <option value="Audição e PAC">Audição e Processamento Auditivo (PAC)</option>
                  <option value="Motricidade Orofacial & Voz">Motricidade Orofacial & Voz</option>
                  <option value="Fluência">Fluência e Gagueira</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Diagnóstico / Queixa Clínica *
                </label>
                <input
                  type="text"
                  value={condicaoClinica}
                  onChange={(e) => setCondicaoClinica(e.target.value)}
                  placeholder="Ex: Troca articulatória (/r/ e /l/), desvio fonológico"
                  className="w-full h-10 px-3 text-sm rounded-xl bg-card-patient border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                />
                {errors.condicaoClinica && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.condicaoClinica}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Objetivo Clínico Ativo (Meta Mensurável) *
                </label>
                <input
                  type="text"
                  value={objetivoAtivo}
                  onChange={(e) => setObjetivoAtivo(e.target.value)}
                  placeholder="Ex: Trabalhar discriminação auditiva e evocação correta do arquifonema /S/"
                  className="w-full h-10 px-3 text-sm rounded-xl bg-card-patient border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                />
                {errors.objetivoAtivo && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.objetivoAtivo}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Seção 4: Prescrição e Liberação de Jogos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <Gamepad2 className="w-4 h-4" />
                <span>4. Jogos Liberados no Plano Terapêutico (RF05 / PLANO_OBJETIVOS)</span>
              </div>
              <span className="text-xs text-muted-foreground font-semibold">
                {selectedGameIds.length} selecionado(s)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Selecione quais jogos estarão desbloqueados para o paciente executar no consultório e em casa.
            </p>

            {errors.games && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.games}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {AVAILABLE_GAMES_CATALOG.map((game: AvailableGameCatalogItem) => {
                const isSelected = selectedGameIds.includes(game.id);
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => toggleGame(game.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-xs'
                        : 'bg-card border-border hover:border-border/80'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-card-patient text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          {game.nome}
                        </h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background border border-border text-muted-foreground shrink-0 font-medium">
                          {game.mecanica}
                        </span>
                      </div>
                      <p className="text-[11px] text-primary-hover font-semibold mt-0.5">
                        {game.habilidade}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {game.descricao}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer com botões */}
        <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-background rounded-xl border border-border transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Salvar Prontuário & Liberar Jogos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
