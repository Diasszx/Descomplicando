import * as React from 'react';
import {
  UserPlus,
  Search,
  Filter,
  Gamepad2,
  Sparkles,
  Play,
  UserCheck,
} from 'lucide-react';
import { INITIAL_PATIENTS, type Patient } from '../types';
import { PatientModal } from './patient-modal';

interface PatientsViewProps {
  onSelectPatientContext?: (patient: Patient | null) => void;
  selectedPatientContextId?: string | null | undefined;
  onNavigateToGames?: () => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  onSelectPatientContext,
  selectedPatientContextId,
  onNavigateToGames,
}) => {
  const [patients, setPatients] = React.useState<Patient[]>(INITIAL_PATIENTS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = React.useState<string>('TODAS');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null);

  const filteredPatients = React.useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.condicaoClinica.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.objetivoAtivo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesArea =
        selectedAreaFilter === 'TODAS' || p.areaTerapeutica === selectedAreaFilter;
      return matchesSearch && matchesArea;
    });
  }, [patients, searchQuery, selectedAreaFilter]);

  const handleCreatePatient = (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev]);
    setFeedbackMessage(`Paciente "${newPatient.nome}" cadastrado com sucesso!`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleToggleSelectContext = (patient: Patient) => {
    if (!onSelectPatientContext) return;
    if (selectedPatientContextId === patient.id) {
      onSelectPatientContext(null);
      setFeedbackMessage('Contexto alternado para: Seu Perfil Profissional (Testes Livres).');
    } else {
      onSelectPatientContext(patient);
      setFeedbackMessage(
        `Contexto ativado: ${patient.nome}. Partidas jogadas agora serão gravadas no prontuário deste paciente.`
      );
    }
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Toast / Alerta de Feedback de Contexto ou Ação */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-xl bg-card border border-primary/30 text-xs font-semibold text-foreground flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header da Tela com Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Gestão de Pacientes & Prontuários
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prescrição terapêutica, acompanhamento de jogos ativos e alternância de contexto (RF03 / RF06).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Paciente</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-card p-3 rounded-2xl border border-border">
        <div className="md:col-span-2 relative flex items-center">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome do paciente, objetivo clínico ou diagnóstico..."
            className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-card-patient border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
          />
        </div>

        <div className="relative flex items-center">
          <Filter className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
          <select
            value={selectedAreaFilter}
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-card-patient border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
          >
            <option value="TODAS">Todas as Áreas Terapêuticas</option>
            <option value="Linguagem e Fala">Linguagem e Fala</option>
            <option value="Audição e PAC">Audição e PAC</option>
            <option value="Motricidade Orofacial & Voz">Motricidade Orofacial & Voz</option>
          </select>
        </div>
      </div>

      {/* Grid de Cards de Pacientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPatients.map((patient) => {
          const isSelected = selectedPatientContextId === patient.id;

          return (
            <div
              key={patient.id}
              className={`bg-card-patient rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-card-patient'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              {/* Topo do Card */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-bold text-foreground truncate">
                        {patient.nome}
                      </h2>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                          <UserCheck className="w-3 h-3" /> Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                      {patient.idadeCalculada} • {patient.faixa_etaria}
                    </p>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-background border border-border text-primary-hover font-semibold shrink-0">
                    {patient.areaTerapeutica}
                  </span>
                </div>

                {/* Queixa & Objetivo Ativo */}
                <div className="mt-3.5 space-y-1.5 p-3 rounded-xl bg-card border border-border/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Diagnóstico / Queixa
                    </span>
                    <p className="text-xs text-foreground font-medium line-clamp-1">
                      {patient.condicaoClinica}
                    </p>
                  </div>
                  <div className="pt-1.5 border-t border-border/40">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">
                      Objetivo Clínico Ativo
                    </span>
                    <p className="text-xs text-foreground font-semibold line-clamp-2">
                      {patient.objetivoAtivo}
                    </p>
                  </div>
                </div>

                {/* Jogos Prescritos / Em Andamento */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-foreground mb-1.5">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Gamepad2 className="w-3.5 h-3.5" />
                      <span>Jogos Prescritos ({patient.jogosPrescritos.length})</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Plano {patient.statusPlano}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {patient.jogosPrescritos.map((jogo) => (
                      <div
                        key={jogo.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/60 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <span className="text-foreground font-medium truncate text-[11px]">
                            {jogo.nome}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-card text-muted-foreground font-semibold shrink-0">
                          {jogo.fasesLiberadas} fases liberadas
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progresso Terapêutico */}
                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-foreground mb-1">
                    <span>Evolução terapêutica</span>
                    <span className="text-primary font-bold">{patient.progressoPercent}%</span>
                  </div>
                  <div className="w-full bg-card h-2 rounded-full overflow-hidden border border-border/40">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${patient.progressoPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Último atendimento: {patient.ultimoAtendimento}
                  </p>
                </div>
              </div>

              {/* Botões de Ação do Card */}
              <div className="mt-5 pt-3 border-t border-border flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSelectContext(patient)}
                  className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isSelected ? 'Desmarcar Paciente' : 'Selecionar Paciente'}</span>
                </button>

                {onNavigateToGames && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSelected && onSelectPatientContext) {
                        onSelectPatientContext(patient);
                      }
                      onNavigateToGames();
                    }}
                    title="Iniciar sessão de jogos com este paciente"
                    className="h-9 px-3 rounded-xl border border-border bg-card hover:bg-background text-foreground text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5 text-primary" />
                    <span>Jogar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Cadastro */}
      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreatePatient}
      />
    </div>
  );
};
