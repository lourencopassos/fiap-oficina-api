# syntax=docker/dockerfile:1

# ---------- build: compila o TypeScript ----------
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate && npm run build

# ---------- deps: somente dependências de produção ----------
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

# ---------- runtime: imagem final enxuta, usuário não-root ----------
FROM node:22-alpine AS runtime
# apk upgrade: aplica correções de segurança do Alpine (musl, zlib...) publicadas após a imagem base.
# npm/npx/corepack removidos: a imagem só executa `node` (ver docker-entrypoint.sh), e o npm CLI
# embutido na imagem base carrega dependências próprias com CVEs (tar, sigstore, pacote...).
RUN apk upgrade --no-cache && apk add --no-cache openssl \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node package.json docker-entrypoint.sh ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
