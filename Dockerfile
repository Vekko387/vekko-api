FROM node:24-alpine AS dependencies

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS builder

WORKDIR /app
RUN corepack enable

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN pnpm prisma:generate
RUN pnpm build
RUN pnpm prune --prod

FROM node:24-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs
EXPOSE 3000

CMD ["node", "dist/main"]
