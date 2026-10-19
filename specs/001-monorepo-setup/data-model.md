# Data Model: Fundação do Monorepo

Esta feature não cria entidades de negócio no banco. As "entidades" são estruturais.

## Workspace
| Campo | Regra |
|-------|-------|
| `name` | `@fono/<nome>` (ex.: `@fono/web`, `@fono/shared`) |
| `kind` | `app` (em `apps/`) ou `package` (em `packages/`) |
| `tasks` | Deve expor `lint`, `typecheck`, `build`, `test`; apps também `dev`; api também `db:validate` |
| `dependencies` | Apps podem depender de `packages/*`; **nunca** de outros apps; sem ciclos |

## Contrato compartilhado (`packages/shared`)
| Campo | Regra |
|-------|-------|
| `schema` | Zod schema exportado com sufixo `Schema` (ex.: `HealthResponseSchema`) |
| `type` | Tipo inferido via `z.infer`, mesmo nome sem sufixo (ex.: `HealthResponse`) |
| local | `src/<dominio>/<nome>.schema.ts`, reexportado em `src/index.ts` |
| deps | Somente `zod` |

### Contrato inicial: `HealthResponse`
| Campo | Tipo | Validação |
|-------|------|-----------|
| `status` | `"ok" \| "degraded"` | enum |
| `service` | string | `trim`, 1–50 chars |
| `version` | string | semver |
| `timestamp` | string | ISO 8601 datetime |

## Pipeline (por app)
Estados: `skipped` (não afetado) → `running` → `passed` | `failed` | `cached`.
Ordem: `lint` → `typecheck` → `build` (^build primeiro) → `test` → `db:validate` (api).
`failed` em qualquer etapa ⇒ check do app vermelho ⇒ merge bloqueado.
