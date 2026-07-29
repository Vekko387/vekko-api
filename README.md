# vekko-api

Backend central da VEKKO, construído com NestJS, TypeScript, Prisma,
PostgreSQL, Redis e BullMQ.

## Responsabilidade

Este projeto é a única autoridade para regras de negócio, autorização,
assinaturas, benefícios, pagamentos, parceiros, atendimentos, recebíveis e
auditoria. Os frontends nunca acessam banco ou integrações sensíveis
diretamente.

## Desenvolvimento

```powershell
corepack pnpm install
Copy-Item .env.example .env
corepack pnpm prisma:generate
corepack pnpm start:dev
```

Endpoints iniciais:

- API: `http://localhost:3000/api/v1`
- Health check: `http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/docs`

## Qualidade

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

As entidades e migrações de negócio serão implementadas nas fases seguintes,
respeitando o Documento Mestre da VEKKO.
