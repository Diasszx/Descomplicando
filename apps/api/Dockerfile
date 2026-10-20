# syntax=docker/dockerfile:1

# ============================================================================
# Stage 1: Prune monorepo para @fono/api usando Turborepo
# ============================================================================
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY . .
RUN pnpm dlx turbo@2.4.4 prune @fono/api --docker

# ============================================================================
# Stage 2: Instalar dependências e compilar @fono/shared + @fono/api
# ============================================================================
FROM node:22-alpine AS installer
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY .npmrc ./
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN pnpm --filter @fono/api db:generate
RUN pnpm turbo run build --filter=@fono/api...

# ============================================================================
# Stage 3: Runner enxuto de produção (usuário não-root) para Google Cloud Run
# ============================================================================
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=installer --chown=node:node /app/package.json ./package.json
COPY --from=installer --chown=node:node /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=installer --chown=node:node /app/node_modules ./node_modules
COPY --from=installer --chown=node:node /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=installer --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=installer --chown=node:node /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=installer --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=installer --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=installer --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=installer --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules

USER node
EXPOSE 8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]
