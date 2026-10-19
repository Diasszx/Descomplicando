# Contract: Pipeline de CI (GitHub Actions)

Arquivo: `.github/workflows/ci.yml` — gatilho: `pull_request` e `push` em `main`.

## Jobs
| Job | Condição | Passos | Check obrigatório |
|-----|----------|--------|-------------------|
| `changes` | sempre | checkout (fetch-depth 0), detecta workspaces afetados via `turbo --dry=json` | — |
| `security` | sempre | `gitleaks` | ✓ |
| `shared` | shared afetado | `turbo run lint typecheck build test --filter=@fono/shared` | ✓ |
| `web` | web ou shared afetado | `turbo run lint typecheck build test --filter=@fono/web...` | ✓ |
| `api` | api ou shared afetado | service Postgres; `turbo run lint typecheck build test db:validate --filter=@fono/api...` | ✓ |
| `mobile` | mobile ou shared afetado | `turbo run lint typecheck build test --filter=@fono/mobile...` | ✓ |

Jobs pulados reportam sucesso (via job agregador `ci-status`) para não travar branch protection.

## Cache
- pnpm store via `actions/setup-node` (`cache: pnpm`).
- `.turbo` via `actions/cache` com chave por SHA e restore por branch.
- Variável `TURBO_FORCE=true` disponível via `workflow_dispatch` para rodar sem cache.

## Regras
- Qualquer falha ⇒ check vermelho ⇒ merge bloqueado.
- Migration com `DROP TABLE|DROP COLUMN|TRUNCATE` falha sem label `allow-destructive-migration`.
