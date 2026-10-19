# Contract: Tarefas dos Workspaces

## Scripts raiz (`package.json`)
| Script | Comando |
|--------|---------|
| `dev` | `turbo run dev` |
| `lint` | `turbo run lint` |
| `typecheck` | `turbo run typecheck` |
| `build` | `turbo run build` |
| `test` | `turbo run test` |
| `ci` | `turbo run lint typecheck build test db:validate` |

Filtro por app: `pnpm dev --filter @fono/web` (inclui dependências internas).

## `turbo.json` (semântica exigida)
| Task | dependsOn | outputs | cache |
|------|-----------|---------|-------|
| `build` | `^build` | `dist/**`, `.expo/**` (exceto cache) | sim |
| `typecheck` | `^build` | — | sim |
| `lint` | — | — | sim |
| `test` | `^build` | `coverage/**` | sim |
| `db:validate` | — | — | não |
| `dev` | `^build` | — | não, `persistent: true` |

## Por workspace
| Workspace | dev | lint | typecheck | build | test | db:validate |
|-----------|-----|------|-----------|-------|------|-------------|
| `@fono/shared` | `tsup --watch` | ✓ | ✓ | `tsup` | vitest | — |
| `@fono/web` | vite | ✓ | ✓ | vite build | vitest | — |
| `@fono/api` | nest start --watch | ✓ | ✓ | nest build | jest | prisma validate + checagem destrutiva |
| `@fono/mobile` | expo start | ✓ | ✓ | `expo export` | jest-expo | — |
