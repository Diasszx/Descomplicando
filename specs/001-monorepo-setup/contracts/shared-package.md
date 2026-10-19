# Contract: `@fono/shared`

## Package exports
```json
{
  "name": "@fono/shared",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" }
  },
  "dependencies": { "zod": "^3" }
}
```

## Public API (v0)
| Export | Kind | Descrição |
|--------|------|-----------|
| `HealthResponseSchema` | Zod schema | Ver [data-model.md](../data-model.md#contrato-inicial-healthresponse) |
| `HealthResponse` | type | `z.infer<typeof HealthResponseSchema>` |
| `parseEnv(schema, source)` | função | Valida env e lança erro listando **apenas nomes** das chaves inválidas |

## HTTP usage
- `GET /health` (api) → `200` corpo `HealthResponse`, sem autenticação, com throttling global.
- web e mobile validam a resposta com `HealthResponseSchema.parse` no hook TanStack Query.

## Rules
- Mudança incompatível em export público ⇒ falha de `typecheck` nos consumidores (SC-003).
- Proibido importar `node:*`, DOM, `react`, `react-native`, `@nestjs/*`, `@prisma/*`.
