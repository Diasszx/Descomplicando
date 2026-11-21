# Requisitos e Produto — FonoGames

Este documento descreve a visão geral da plataforma, perfis de usuários, requisitos funcionais (RF), requisitos não-funcionais (RNF), mapa de telas (UX/UI) e cenários de validação.

---

## 1. Visão Geral da Plataforma

A **FonoGames** é uma plataforma de apoio à intervenção fonoaudiológica que utiliza jogos digitais e gamificação como recursos terapêuticos complementares. O sistema é estruturado em torno de dois modelos de utilização:

1. **Modelo Fonoaudiológico:** O fonoaudiólogo gerencia seus pacientes, prescreve jogos específicos e acompanha o progresso clínico. Conta com um perfil próprio automático para jogar livremente sem poluir o prontuário dos pacientes. Ao selecionar um paciente, qualquer jogo executado grava as métricas diretamente no prontuário do paciente selecionado.
2. **Modelo de Uso Autônomo (Pessoa Comum):** O usuário cria seu perfil autônomo e obtém acesso a um painel individual contendo seu perfil, catálogo completo de jogos e dashboard de progresso pessoal (sem funcionalidades clínicas de gestão de pacientes).

---

## 2. Perfis de Usuários

- **Administrador (Gestor do Sistema):** Responsável por gerenciar os cadastros globais da matriz terapêutica (áreas, habilidades, objetivos, exercícios e jogos) e administrar contas de profissionais.
- **Fonoaudiólogo (Profissional):**
  - Possui um perfil individual automático criado no cadastro para jogar e testar o catálogo.
  - Gerencia pacientes, define objetivos clínicos e libera jogos específicos.
  - Alterna entre seu perfil e o contexto de um paciente com um clique.
- **Paciente:**
  - Acessa a plataforma com credenciais próprias geradas pelo fonoaudiólogo.
  - Visualiza e executa apenas os jogos liberados em seu plano terapêutico ativo.
  - Personaliza seu avatar e acompanha desempenho em um dashboard lúdico.
  - Responsáveis por menores utilizam esses dados de acesso para acompanhamento em casa.
- **Usuário Autônomo (Pessoa Comum):**
  - Cria conta independente.
  - Acesso livre a todo o catálogo de jogos e dashboard pessoal.
  - Não tem acesso a prontuários ou ferramentas de gestão clínica.

---

## 3. Requisitos do Sistema

### Requisitos Funcionais (RF)
- **RF01 - Gestão de Administradores:** Gerenciamento de conteúdos base da matriz terapêutica e contas de profissionais.
- **RF02 - Gestão de Profissionais:** Cadastro, autenticação, criação automática de perfil de testes e gestão da conta.
- **RF03 - Gestão de Pacientes e Credenciais:** Cadastro de pacientes pelo fonoaudiólogo com geração de e-mail e senha de acesso remoto.
- **RF04 - Matriz de Conteúdo Terapêutico:** Estruturação hierárquica (`Área` $\rightarrow$ `Habilidade` $\rightarrow$ `Objetivo` $\rightarrow$ `Exercício` $\rightarrow$ `Jogo` $\rightarrow$ `Nível`).
- **RF05 - Prescrição de Jogos:** Associação de metas clínicas e liberação/bloqueio de jogos para o paciente.
- **RF06 - Acesso e Execução por Contexto:**
  - Pacientes acessam apenas jogos liberados.
  - Fonoaudiólogos e Autônomos acessam o catálogo completo.
  - Execução grava métricas automaticamente no perfil ativo ou no paciente selecionado.
- **RF07 - Dashboard de Evolução por Perfil:**
  - *Fonoaudiólogo:* Métricas do paciente e visão consolidada da clínica.
  - *Paciente:* Progresso lúdico individual (estrelas, pontos).
  - *Autônomo:* Histórico de evolução pessoal nos jogos.

### Requisitos Não Funcionais (RNF)
- **RNF01 - Desempenho:** Captura instantânea e silenciosa de métricas (acertos, erros, tempo e tentativas).
- **RNF02 - Usabilidade e Ludicidade:** Interface lúdica para pacientes/crianças e limpa/orientada a dados para o profissional.
- **RNF03 - Disponibilidade:** Acesso multiplataforma (Web, tablets e smartphones).
- **RNF04 - Privacidade e Segurança:** Conformidade rigorosa com a LGPD e isolamento total entre prontuários.

---

## 4. Estrutura de Telas e Navegação (UX/UI)

### 4.1 Painel do Fonoaudiólogo (Sidebar Fixa)
- **Meu Perfil (`/fono/perfil`):** Dados cadastrais, foto/avatar, CRFa, dados da clínica e alteração de senha.
- **Pacientes (`/fono/pacientes`):**
  - Lista de pacientes em cards com nome, faixa etária, último atendimento e tag do objetivo ativo.
  - **Botão "Selecionar Paciente":** Ativa o contexto do paciente para atendimentos na clínica.
  - **Botão "+ Cadastrar Paciente":** Modal para dados pessoais, geração de login/senha e seleção inicial de metas/jogos.
  - Link de acesso direto ao prontuário e histórico.
- **Jogos (`/fono/jogos`):**
  - Catálogo completo com filtros por área, habilidade, faixa etária e mecânica.
  - **Ação "JOGAR":** Se houver paciente selecionado, grava no prontuário dele. Caso contrário, grava no perfil de testes do fonoaudiólogo.
- **Dashboard / Relatórios (`/fono/dashboard`):** KPIs gerais do consultório, relatórios individuais, timeline por sessão (S1, S2, S3...) e exportação em PDF.
- **Configurações / Sair (`/fono/configuracoes`):** Notificações, preferências e logout seguro.

### 4.2 Painel do Paciente (`/app/paciente`)
- **Minhas Atividades (`/app/paciente/jogos`):** Interface colorida e lúdica com apenas os jogos liberados pelo fonoaudiólogo.
- **Personalizar Avatar (`/app/paciente/perfil`):** Customização de avatar e perfil.
- **Meu Desempenho (`/app/paciente/dashboard`):** Dashboard simplificado com partidas, acertos e evolução.

### 4.3 Painel do Usuário Autônomo (`/app/autonomo`)
- **Meu Perfil (`/app/autonomo/perfil`):** Dados cadastrais e credenciais.
- **Catálogo de Jogos (`/app/autonomo/jogos`):** Acesso irrestrito a todo o catálogo de jogos.
- **Meu Dashboard (`/app/autonomo/dashboard`):** Estatísticas pessoais, histórico e gráficos de evolução.

---

## 5. Cenários Práticos de Uso e Validação

1. **Atendimento Presencial na Clínica:** Fonoaudiólogo seleciona o paciente no sistema, vai até a tela de jogos e clica em **JOGAR**. Os dados alimentam automaticamente o prontuário da criança sem passos intermediários.
2. **Teste Livre do Fonoaudiólogo:** Fonoaudiólogo acessa a área de jogos sem nenhum paciente selecionado. Joga livremente e os dados são salvos no seu próprio perfil de testes.
3. **Uso Domiciliar pelo Paciente:** O paciente faz login em casa, realiza as atividades liberadas no seu plano e o fonoaudiólogo acompanha o resultado pelo dashboard clínico.
4. **Uso por Pessoa Comum (Autônomo):** Usuário comum cadastra-se sozinho, navega pelo catálogo e acompanha seu progresso individual sem envolvimento clínico.
