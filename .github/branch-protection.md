# Configuração de Branch Protection — Branch `main`

Para garantir conformidade com a **Constituição (Princípio IV)** e o requisito **FR-011**, as seguintes regras devem ser configuradas nas configurações de branches do repositório no GitHub (`Settings` -> `Branches` -> `Branch protection rule` para `main`):

## Regras Obrigatórias

1. **Require a pull request before merging**:
   - Ativado.
   - Pelo menos 1 aprovação obrigatória de revisão de código (`Require approvals: 1`).
   - `Dismiss stale pull request approvals when new commits are pushed`: Ativado.
2. **Require status checks to pass before merging**:
   - Ativado.
   - `Require branches to be up to date before merging`: Ativado.
   - **Status Checks Obrigatórios**:
     - `Security Scan (Gitleaks)`
     - `CI Quality Gate Status`
     - `Shared Package Pipeline` (quando aplicável)
     - `Web App Pipeline` (quando aplicável)
     - `API Pipeline` (quando aplicável)
     - `Mobile App Pipeline` (quando aplicável)
3. **Do not allow bypassing the above settings**:
   - Ativado para todos, inclusive administradores.
4. **Require conversation resolution before merging**:
   - Ativado.
