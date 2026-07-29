# vekko-api

Backend central da VEKKO, construído com NestJS, TypeScript, Prisma,
PostgreSQL, Redis e BullMQ.

## Responsabilidade

Este projeto é a única autoridade para regras de negócio, autorização,
assinaturas, benefícios, pagamentos, parceiros, atendimentos, recebíveis e
auditoria. Os frontends nunca acessam banco ou integrações sensíveis
diretamente.

## Pré-requisitos

- Node.js 24;
- pnpm 11 via Corepack;
- Docker Desktop com Docker Compose.

## Desenvolvimento local

```powershell
corepack pnpm install
corepack pnpm infra:setup
corepack pnpm infra:up
corepack pnpm prisma:migrate:dev
corepack pnpm start:dev
```

O setup gera credenciais locais em arquivos ignorados pelo Git. Não copie
credenciais reais para `.env.example`.

## Endpoints

- API: `http://localhost:3000/api/v1`
- Liveness: `http://localhost:3000/api/v1/health/live`
- Readiness: `http://localhost:3000/api/v1/health/ready`
- Swagger: `http://localhost:3000/docs`

## Qualidade

```powershell
corepack pnpm prisma:validate
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test --runInBand
corepack pnpm test:e2e --runInBand
corepack pnpm build
```

Os testes E2E exigem PostgreSQL e Redis locais em execução.

## Ambientes

As configurações de development, test, staging e production estão documentadas
em [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md).
