# Feature Specification: Autenticação e Login do Sistema

**Feature Branch**: `002-firebase-auth-login`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Quero fazer o login do sistema utilizando o firebase auth. Preciso ajustar essa parte"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login de Usuário com Credenciais Válidas (Priority: P1)

Como usuário cadastrado e ativo da plataforma web FonoGames (`ADMIN`, `PROFISSIONAL`, `PACIENTE` ou `AUTONOMO`), quero acessar o sistema utilizando meu e-mail e senha para entrar no painel correspondente ao meu perfil de acesso.

**Why this priority**: É o fluxo central e indispensável para qualquer utilização autenticada da plataforma, garantindo que cada usuário acesse apenas os recursos permitidos ao seu perfil.

**Independent Test**: Pode ser testado de forma independente inserindo credenciais válidas na tela de login web e verificando que o usuário tem seu e-mail e identidade verificados, seu perfil interno carregado e é redirecionado ao painel inicial dedicado ao seu perfil (ou à troca obrigatória de senha no primeiro acesso de paciente).

**Acceptance Scenarios**:

1. **Given** um usuário cadastrado, ativo e com e-mail verificado na plataforma, **When** ele informa e-mail e senha válidos e confirma o login, **Then** sua identidade é verificada, seu perfil de acesso é carregado da fonte de verdade interna e ele é direcionado ao painel inicial dedicado ao seu perfil.
2. **Given** um usuário que conclui o primeiro acesso após vínculo inicial ou criação de conta com e-mail verificado, **When** ele efetua o login com sucesso pela primeira vez, **Then** o sistema vincula automaticamente sua identidade autenticada ao seu cadastro interno e libera o acesso ao painel correspondente (respeitando exigências de troca de senha ou MFA do perfil).
3. **Given** um usuário com perfil `PACIENTE` realizando seu primeiro acesso com senha gerada pelo fonoaudiólogo, **When** ele informa e-mail e a senha temporária válidos, **Then** o sistema exige que ele defina uma nova senha pessoal (atendendo à política mínima de segurança) antes de liberar o painel do paciente.
4. **Given** um usuário cadastrado cujo e-mail ainda não foi verificado, **When** ele tenta efetuar login, **Then** o sistema bloqueia o acesso ao painel, informa que a verificação do e-mail é obrigatória e oferece a opção de reenviar as instruções de confirmação.
5. **Given** um usuário que informa e-mail ou senha inválidos, **When** ele tenta efetuar login, **Then** o sistema impede o acesso e exibe uma mensagem de erro clara e amigável em português do Brasil, sem expor qual campo específico falhou nem confirmar a existência do e-mail.

---

### User Story 2 - Autenticação Multifator (MFA via TOTP) para Perfis Clínicos e Administrativos (Priority: P1)

Como Gestor (`ADMIN`) ou Fonoaudiólogo (`PROFISSIONAL`), preciso concluir uma verificação em duas etapas utilizando código temporário gerado por aplicativo autenticador (TOTP) ao fazer login para proteger os dados clínicos e prontuários de pacientes contra acessos não autorizados.

**Why this priority**: A proteção de dados sensíveis de saúde exige obrigatoriamente verificação adicional para perfis com acesso administrativo ou clínico.

**Independent Test**: Pode ser testado tentando autenticar na web com uma conta de perfil `ADMIN` ou `PROFISSIONAL` e verificando que o sistema exige a configuração inicial ou o código TOTP do aplicativo autenticador antes de liberar o painel, enquanto perfis `PACIENTE` e `AUTONOMO` acessam normalmente sem obrigatoriedade de MFA (podendo ativá-lo opcionalmente).

**Acceptance Scenarios**:

1. **Given** um usuário com perfil `ADMIN` ou `PROFISSIONAL` sem segundo fator TOTP configurado, **When** ele realiza login com e-mail e senha válidos, **Then** o sistema exige a configuração inicial do aplicativo autenticador (exibindo QR Code e chave manual para vínculo e confirmando um primeiro código válido) antes de conceder acesso completo às funcionalidades clínicas ou administrativas.
2. **Given** um usuário com perfil `ADMIN` ou `PROFISSIONAL` com MFA TOTP já configurado, **When** ele insere e-mail e senha válidos, **Then** o sistema solicita o código de verificação gerado pelo aplicativo autenticador e só libera a sessão após validação bem-sucedida.
3. **Given** um usuário informando um código TOTP inválido ou expirado durante o desafio de segundo fator, **When** ele submete o código, **Then** o sistema nega o acesso ao painel, exibe mensagem orientativa clara e permite nova tentativa dentro do limite de segurança configurado.
4. **Given** um usuário com perfil `PACIENTE` ou `AUTONOMO`, **When** ele realiza login sem MFA habilitado, **Then** o sistema permite o acesso direto ao seu painel (após eventuais exigências de primeiro acesso), oferecendo a opção de configurar MFA TOTP posteriormente caso deseje.

---

### User Story 3 - Cadastro Autônomo e Verificação de E-mail (Priority: P2)

Como Pessoa Comum (Usuário Autônomo), quero criar minha própria conta na aplicação web informando meus dados básicos de acesso e verificando meu e-mail para utilizar livremente o catálogo de jogos e acompanhar meu progresso pessoal.

**Why this priority**: Viabiliza o Modelo de Uso Autônomo de forma independente da intervenção de um fonoaudiólogo, ampliando o alcance da plataforma com validação mínima de identidade.

**Independent Test**: Pode ser testado preenchendo o formulário de cadastro autônomo com senha dentro da política mínima, verificando o envio da confirmação de e-mail, concluindo a confirmação e entrando no painel dedicado ao perfil `AUTONOMO`.

**Acceptance Scenarios**:

1. **Given** um visitante na tela de cadastro autônomo, **When** ele informa nome, e-mail válido e senha com no mínimo 8 caracteres contendo pelo menos uma letra maiúscula e uma letra minúscula, **Then** sua conta é criada com perfil `AUTONOMO`, o sistema envia o link de verificação para o e-mail informado e orienta a confirmação antes de liberar o painel.
2. **Given** um visitante tentando se cadastrar com um e-mail que já existe no sistema, **When** ele submete o cadastro, **Then** o sistema impede a duplicação, informa explicitamente que o e-mail já está cadastrado e orienta o usuário a fazer login ou recuperar sua senha.
3. **Given** um visitante que preenche uma senha abaixo dos critérios mínimos (menos de 8 caracteres, sem letra maiúscula ou sem letra minúscula), **When** ele tenta prosseguir no formulário, **Then** o sistema impede o envio e exibe mensagem clara indicando exatamente quais critérios não foram atendidos.

---

### User Story 4 - Recuperação de Senha, Encerramento de Sessão e Proteção em Computadores Compartilhados (Priority: P2)

Como usuário da plataforma web, quero poder redefinir minha senha caso a esqueça e encerrar minha sessão manualmente ou por inatividade — com encerramento imediato em todas as abas abertas — garantindo que minha conta e os dados clínicos permaneçam protegidos em computadores compartilhados de clínicas ou residências.

**Why this priority**: Reduz bloqueios de acesso por esquecimento de credenciais e elimina o risco de exposição de dados clínicos quando uma aba fica aberta em dispositivos compartilhados.

**Independent Test**: Pode ser testado solicitando a recuperação de senha na tela de login (verificando confirmação neutra), abrindo duas abas autenticadas no mesmo navegador e confirmando que o logout manual ou o timeout de 30 minutos de inatividade em uma aba encerra imediatamente a sessão em ambas.

**Acceptance Scenarios**:

1. **Given** um usuário na tela de login que esqueceu sua senha, **When** ele solicita a redefinição informando seu e-mail, **Then** o sistema envia instruções de recuperação para o endereço informado (quando existente) e exibe uma confirmação neutra sem vazar se o e-mail está cadastrado.
2. **Given** um usuário autenticado com uma ou mais abas abertas no mesmo navegador, **When** ele aciona a opção de sair (logout) em qualquer aba, **Then** sua sessão local é encerrada imediatamente em todas as abas abertas e todas são redirecionadas para a tela de login, impedindo acesso a páginas protegidas sem nova autenticação.
3. **Given** um usuário autenticado que permanece inativo por 30 minutos consecutivos em todas as abas abertas do navegador, **When** o tempo limite é atingido, **Then** o sistema encerra a sessão automaticamente em todas as abas abertas e solicita novo login para retomar o uso.

---

### Edge Cases

- **Conta inativa ou revogada**: Quando um usuário teve seu acesso desativado ou sua sessão revogada administrativamente, o sistema deve bloquear o acesso imediatamente mesmo que possua sessão em cache local, exibindo mensagem informativa.
- **Sincronização parcial idempotente**: Se a criação da conta no provedor de identidade for concluída, mas a vinculação inicial com o cadastro interno falhar por instabilidade de rede, uma nova tentativa ou o próximo login deve retomar e concluir o vínculo de forma idempotente sem bloquear o usuário.
- **Múltiplas abas em computadores compartilhados (clínicas)**: Quando o usuário realiza logout manual ou atinge o timeout de 30 minutos em uma aba do navegador, todas as demais abas abertas da plataforma naquele navegador devem encerrar a sessão imediatamente e ocultar dados protegidos.
- **Troca obrigatória de senha de `PACIENTE` interrompida**: Se um paciente em primeiro acesso encerrar ou atualizar o navegador antes de concluir a troca obrigatória da senha gerada pelo fonoaudiólogo, o sistema deve voltar a exigir a definição de uma nova senha no próximo login antes de liberar o painel.
- **Perda do dispositivo de MFA TOTP**: Caso um usuário `ADMIN` ou `PROFISSIONAL` perca acesso ao aplicativo autenticador configurado, o sistema deve manter o acesso bloqueado sem o segundo fator válido até que a administração realize a redefinição do MFA da conta.
- **Excesso de tentativas inválidas**: Quando ocorrerem múltiplas tentativas consecutivas de login, verificação de código TOTP ou recuperação de senha sem sucesso, o sistema deve aplicar limitação temporária de tentativas para prevenir ataques automatizados e informar o usuário para aguardar antes de tentar novamente.
- **Falha de conexão durante o login**: Se houver instabilidade de rede durante a autenticação ou sincronização inicial da conta, o sistema deve exibir estado de erro claro com opção de tentar novamente, sem deixar o usuário preso em tela de carregamento infinita.
- **Usuário autenticado acessando rota de login**: Se um usuário já autenticado (e com todas as etapas obrigatórias concluídas) acessar a tela de login ou cadastro, o sistema deve redirecioná-lo automaticamente para o painel inicial correspondente ao seu perfil.
- **Sessão expirada durante uso ativo**: Caso a credencial de sessão expire ou seja invalidada durante uma ação, o sistema deve tentar renovar silenciosamente quando válida ou encerrar a sessão e solicitar nova autenticação preservando a segurança dos dados.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que usuários cadastrados e ativos entrem na plataforma web utilizando e-mail e senha através do provedor de identidade configurado.
- **FR-002**: O sistema MUST validar os formatos de entrada antes do envio dos formulários (exigindo e-mail válido e preenchimento obrigatório no login, e exigindo senha com no mínimo 8 caracteres, contendo pelo menos uma letra maiúscula e uma letra minúscula nos fluxos de criação e alteração/redefinição de senha), exibindo mensagens de erro acessíveis e compreensíveis em português do Brasil.
- **FR-003**: O sistema MUST sincronizar de forma idempotente a identidade autenticada do usuário com o cadastro interno da plataforma no primeiro acesso e a cada início de sessão, obtendo o perfil de acesso (`ADMIN`, `PROFISSIONAL`, `PACIENTE` ou `AUTONOMO`) exclusivamente da fonte de verdade interna.
- **FR-004**: O sistema MUST impedir que o cliente escolha ou altere seu próprio perfil de acesso durante o login ou sincronização, exceto no auto-cadastro que atribui exclusivamente o perfil `AUTONOMO`.
- **FR-005**: O sistema MUST exigir autenticação multifator (MFA) via TOTP por aplicativo autenticador para usuários dos perfis `ADMIN` e `PROFISSIONAL` (incluindo configuração inicial obrigatória no primeiro acesso sem segundo fator), mantendo o MFA via TOTP opcional para os perfis `PACIENTE` e `AUTONOMO`.
- **FR-006**: O sistema MUST permitir o auto-cadastro de novos usuários no perfil `AUTONOMO` com nome, e-mail e senha (seguindo `FR-002`), exigindo a verificação do e-mail antes de liberar o painel e informando explicitamente quando o e-mail informado já estiver cadastrado.
- **FR-007**: O sistema MUST exigir a alteração obrigatória da senha (seguindo `FR-002`) no primeiro acesso de usuários com perfil `PACIENTE` cuja credencial tenha sido gerada pelo fonoaudiólogo, bloqueando o acesso ao painel até a conclusão da troca.
- **FR-008**: O sistema MUST oferecer fluxo de recuperação e redefinição de senha via e-mail a partir da tela de login, com resposta neutra que não revele a existência de contas.
- **FR-009**: O sistema MUST permitir o encerramento explícito da sessão (logout), limpando o estado de autenticação local, redirecionando para a tela de login e propagando o encerramento imediatamente para todas as abas abertas do mesmo navegador.
- **FR-010**: O sistema MUST encerrar automaticamente a sessão após 30 minutos consecutivos de inatividade (sincronizado entre todas as abas abertas no mesmo navegador) e verificar a validade e eventual revogação da credencial nas requisições protegidas.
- **FR-011**: O sistema MUST redirecionar cada usuário autenticado (com e-mail verificado e eventuais etapas obrigatórias de troca de senha e MFA concluídas) exclusivamente ao painel inicial dedicado ao seu perfil (`ADMIN`, `PROFISSIONAL`, `PACIENTE` ou `AUTONOMO`), bloqueando o acesso a áreas de outros perfis.
- **FR-012**: O sistema MUST aplicar proteção contra abuso (limitação de taxa de requisições) nos fluxos sensíveis de autenticação, validação de MFA, sincronização de conta e recuperação de senha.
- **FR-013**: O sistema MUST apresentar feedback visual explícito para estados de carregamento (desabilitando envio duplicado), erro e sucesso durante todo o fluxo de autenticação, mantendo conformidade de acessibilidade (navegação por teclado, foco visível e rótulos adequados).
- **FR-014**: O sistema MUST omitir senhas, códigos TOTP, tokens de acesso e dados clínicos sensíveis de quaisquer registros de log ou mensagens de erro exibidas ao usuário.

### Key Entities *(include if feature involves data)*

- **Conta de Usuário**: Representa o usuário cadastrado na plataforma, contendo identificador único interno, identificador de vínculo com o provedor de identidade externo, nome, e-mail, indicação de e-mail verificado, perfil de acesso (`ADMIN`, `PROFISSIONAL`, `PACIENTE`, `AUTONOMO`), estado da conta (ativo/inativo), status de exigência/configuração de MFA TOTP e indicador de alteração obrigatória de senha no primeiro acesso.
- **Sessão Autenticada**: Representa o estado de acesso ativo do usuário na aplicação web, vinculado à credencial emitida pelo provedor de identidade, sujeito a expiração, revogação, timeout por inatividade de 30 minutos e sincronização de encerramento entre abas abertas do mesmo navegador.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários com credenciais válidas, e-mail verificado e sem pendências de primeiro acesso conseguem concluir o login e visualizar o painel inicial do seu perfil em menos de 5 segundos em condições normais de rede.
- **SC-002**: 100% das tentativas de acesso a áreas ou dados protegidos sem credencial válida, com e-mail não verificado, com conta inativa, com perfil não autorizado ou com sessão revogada são bloqueadas, impedindo a exposição de qualquer dado protegido.
- **SC-003**: 100% dos usuários dos perfis `ADMIN` e `PROFISSIONAL` concluem a configuração inicial ou a validação do código TOTP via aplicativo autenticador antes de acessar áreas administrativas ou prontuários de pacientes.
- **SC-004**: Em validação de QA, 100% dos usuários autenticados são direcionados exclusivamente ao painel inicial correspondente ao seu perfil (`ADMIN`, `PROFISSIONAL`, `PACIENTE` ou `AUTONOMO`), e 100% dos pacientes em primeiro acesso com senha gerada pelo fonoaudiólogo são retidos no fluxo de troca obrigatória de senha antes de acessar o painel.
- **SC-005**: Em validação de QA, 100% das sessões ociosas por 30 minutos consecutivos ou encerradas via logout manual são invalidadas em todas as abas abertas do mesmo navegador, exigindo nova autenticação em até 2 segundos após o evento.
- **SC-006**: 95% dos usuários conseguem concluir o cadastro autônomo (incluindo verificação de e-mail) ou a recuperação de senha na primeira tentativa sem necessidade de suporte técnico.
- **SC-007**: Nenhuma senha, código TOTP ou token de sessão é exposto em logs de aplicação ou mensagens de interface.

## Assumptions

- **Restrição de Plataforma e Governança**: Conforme estabelecido na Constituição da FonoGames e na diretriz solicitada para esta entrega, a identidade primária utiliza o **Firebase Authentication** como provedor externo (cadastro/login por e-mail e senha, verificação de e-mail e redefinição de senha), enquanto o segundo fator **TOTP via aplicativo autenticador**, o cadastro interno de negócio e os perfis de acesso residem exclusivamente na fonte de verdade interna da plataforma. Provedores sociais (como Google ou Apple) não fazem parte desta entrega.
- **Escopo de Plataformas (API + Web)**: Esta especificação cobre exclusivamente a API de retaguarda e a aplicação Web. O suporte ao aplicativo Mobile fica explicitamente fora deste escopo e será tratado em uma entrega futura dedicada.
- **Painéis Iniciais e Limites Clínicos**: Após o login, cada perfil é redirecionado para uma rota protegida inicial dedicada seguindo a identidade visual da FonoGames. As funcionalidades completas de gestão clínica — incluindo o **Perfil de Teste Automático** do fonoaudiólogo (perfil pessoal separado para jogar livremente sem poluir prontuários de pacientes) — ficam fora desta entrega e pertencem às features clínicas subsequentes.
- **Provisionamento de Contas Clínicas e Administrativas**: Contas de `PROFISSIONAL` são gerenciadas/aprovadas pela administração e contas de `PACIENTE` são geradas pelo fonoaudiólogo responsável com senha temporária inicial (exigindo troca no primeiro acesso), não havendo auto-cadastro para esses perfis.
- **Recuperação de MFA TOTP**: Em caso de perda do dispositivo autenticador por um usuário `ADMIN` ou `PROFISSIONAL`, a redefinição do vínculo de segundo fator é tratada por fluxo administrativo operacional.
- **Idioma e Acessibilidade**: Toda a interface de autenticação será apresentada em português do Brasil e seguirá os padrões de acessibilidade e identidade visual da FonoGames.
