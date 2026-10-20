# syntax=docker/dockerfile:1

# ============================================================================
# Stage 1: Prune monorepo para @fono/web usando Turborepo
# ============================================================================
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY . .
RUN pnpm dlx turbo@2.4.4 prune @fono/web --docker

# ============================================================================
# Stage 2: Instalar dependências e gerar bundle estático de produção (Vite)
# ============================================================================
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY .npmrc ./
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

ARG VITE_API_URL=https://fono-api.example.run.app
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm turbo run build --filter=@fono/web...

# ============================================================================
# Stage 3: Runner Nginx não-privilegiado (usuário não-root na porta 8080)
# ============================================================================
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
