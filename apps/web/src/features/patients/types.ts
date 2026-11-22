export interface AssignedGame {
  id: string;
  nome: string;
  categoria: string;
  status: 'ATIVO' | 'PAUSADO' | 'CONCLUIDO';
  icone?: string;
  fasesLiberadas: number;
}

export interface Patient {
  id: string;
  usuario_id: string;
  nome: string;
  email: string;
  telefoneResponsavel?: string | undefined;
  data_nascimento: string;
  idadeCalculada: string;
  faixa_etaria: 'Infantil I (3-5)' | 'Escolar (6-9)' | 'Juvenil (10-14)' | 'Adolescente/Adulto (15+)';
  condicaoClinica: string;
  objetivoAtivo: string;
  areaTerapeutica: string;
  ultimoAtendimento: string;
  progressoPercent: number;
  jogosPrescritos: AssignedGame[];
  statusPlano: 'ATIVO' | 'PAUSADO' | 'CONCLUIDO';
}

export interface AvailableGameCatalogItem {
  id: string;
  nome: string;
  mecanica: 'MEMORIA' | 'ASSOCIACAO' | 'SEQUENCIA' | 'ARTICULACAO';
  areaTerapeutica: string;
  habilidade: string;
  faixaEtariaRecomendada: string;
  descricao: string;
}

export const AVAILABLE_GAMES_CATALOG: AvailableGameCatalogItem[] = [
  {
    id: 'game-1',
    nome: 'Detetive das Sílabas',
    mecanica: 'ASSOCIACAO',
    areaTerapeutica: 'Linguagem e Fala',
    habilidade: 'Consciência Fonológica',
    faixaEtariaRecomendada: 'Escolar (6-9)',
    descricao: 'Descubra e agrupe as sílabas correspondentes a cada figura.',
  },
  {
    id: 'game-2',
    nome: 'Memória dos Animais & Rimas',
    mecanica: 'MEMORIA',
    areaTerapeutica: 'Linguagem e Fala',
    habilidade: 'Rimas e Aliterações',
    faixaEtariaRecomendada: 'Infantil I (3-5)',
    descricao: 'Encontre os pares com sons e nomes rimados.',
  },
  {
    id: 'game-3',
    nome: 'Sons do Cotidiano & Frequências',
    mecanica: 'SEQUENCIA',
    areaTerapeutica: 'Audição e PAC',
    habilidade: 'Discriminação Auditiva',
    faixaEtariaRecomendada: 'Escolar (6-9)',
    descricao: 'Treino de discriminação e reprodução de sequências sonoras.',
  },
  {
    id: 'game-4',
    nome: 'Trilha Vocálica (A-E-I-O-U)',
    mecanica: 'ARTICULACAO',
    areaTerapeutica: 'Motricidade Orofacial & Voz',
    habilidade: 'Abertura Vocálica e Articulação',
    faixaEtariaRecomendada: 'Infantil I (3-5)',
    descricao: 'Exercícios motores orofaciais e produção sustentada de vogais.',
  },
  {
    id: 'game-5',
    nome: 'Desafio do /R/ e /L/ na Floresta',
    mecanica: 'ASSOCIACAO',
    areaTerapeutica: 'Linguagem e Fala',
    habilidade: 'Diferenciação Fonética',
    faixaEtariaRecomendada: 'Escolar (6-9)',
    descricao: 'Identificação e distinção de fonemas líquidos (/r/ e /l/).',
  },
];

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p-1',
    usuario_id: 'usr-101',
    nome: 'Lucas Gabriel Silveira',
    email: 'lucas.silveira@paciente.fonogames.com',
    telefoneResponsavel: '(11) 98765-4321',
    data_nascimento: '2019-04-12',
    idadeCalculada: '7 anos',
    faixa_etaria: 'Escolar (6-9)',
    condicaoClinica: 'Troca articulatória (/r/ e /l/) com desvio fonológico leve',
    objetivoAtivo: 'Discriminação e produção do fonema /r/ intervocálico',
    areaTerapeutica: 'Linguagem e Fala',
    ultimoAtendimento: 'Hoje às 14:30',
    progressoPercent: 78,
    statusPlano: 'ATIVO',
    jogosPrescritos: [
      {
        id: 'game-1',
        nome: 'Detetive das Sílabas',
        categoria: 'Consciência Fonológica',
        status: 'ATIVO',
        fasesLiberadas: 3,
      },
      {
        id: 'game-5',
        nome: 'Desafio do /R/ e /L/ na Floresta',
        categoria: 'Diferenciação Fonética',
        status: 'ATIVO',
        fasesLiberadas: 2,
      },
    ],
  },
  {
    id: 'p-2',
    usuario_id: 'usr-102',
    nome: 'Helena Duarte Ramos',
    email: 'helena.ramos@paciente.fonogames.com',
    telefoneResponsavel: '(11) 99123-8877',
    data_nascimento: '2021-08-25',
    idadeCalculada: '5 anos',
    faixa_etaria: 'Infantil I (3-5)',
    condicaoClinica: 'Atraso simples de linguagem expressiva',
    objetivoAtivo: 'Expansão de vocabulário e evocação de sequências',
    areaTerapeutica: 'Linguagem e Fala',
    ultimoAtendimento: 'Ontem às 10:00',
    progressoPercent: 64,
    statusPlano: 'ATIVO',
    jogosPrescritos: [
      {
        id: 'game-2',
        nome: 'Memória dos Animais & Rimas',
        categoria: 'Rimas e Aliterações',
        status: 'ATIVO',
        fasesLiberadas: 4,
      },
    ],
  },
  {
    id: 'p-3',
    usuario_id: 'usr-103',
    nome: 'Theo Mendonça Costa',
    email: 'theo.costa@paciente.fonogames.com',
    telefoneResponsavel: '(21) 97654-3210',
    data_nascimento: '2018-02-14',
    idadeCalculada: '8 anos',
    faixa_etaria: 'Escolar (6-9)',
    condicaoClinica: 'Dificuldade em consciência fonológica e percepção de rimas',
    objetivoAtivo: 'Segmentação silábica e identificação de rimas sonoras',
    areaTerapeutica: 'Audição e PAC',
    ultimoAtendimento: '18/11 às 16:00',
    progressoPercent: 90,
    statusPlano: 'ATIVO',
    jogosPrescritos: [
      {
        id: 'game-1',
        nome: 'Detetive das Sílabas',
        categoria: 'Consciência Fonológica',
        status: 'ATIVO',
        fasesLiberadas: 5,
      },
      {
        id: 'game-3',
        nome: 'Sons do Cotidiano & Frequências',
        categoria: 'Discriminação Auditiva',
        status: 'ATIVO',
        fasesLiberadas: 3,
      },
    ],
  },
];
