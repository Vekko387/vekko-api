# Ambientes da VEKKO API

## Development

O desenvolvimento utiliza PostgreSQL e Redis locais via Docker Compose. As
credenciais são geradas localmente e nunca devem ser adicionadas ao Git.

```powershell
corepack pnpm infra:setup
corepack pnpm infra:up
corepack pnpm prisma:migrate:dev
corepack pnpm start:dev
```

Arquivos locais ignorados:

```text
.env.infrastructure.local
.env.development.local
.env.test.local
```

## Test

Os testes E2E usam o banco `vekko_test` e o database Redis `1`. A preparação
aplica as migrations antes da suíte:

```powershell
corepack pnpm test:e2e
```

## Staging

Staging utiliza um ambiente persistente no Railway com três serviços:

```text
vekko-api
Postgres
Redis
```

Variáveis do serviço `vekko-api`:

```text
NODE_ENV=staging
API_PREFIX=api/v1
CORS_ORIGINS=
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
REDIS_KEY_PREFIX=vekko:staging
REDIS_CONNECT_TIMEOUT_MS=5000
DEPENDENCY_HEALTH_TIMEOUT_MS=2000
THROTTLE_LIMIT=100
THROTTLE_TTL_MS=60000
```

`CORS_ORIGINS` deve receber somente os domínios reais dos frontends de staging.
Enquanto estiver vazio, chamadas cross-origin permanecem bloqueadas.

O Railway executa as migrations no pre-deploy e valida:

```text
/api/v1/health/ready
```

## Production

Produção não utiliza arquivos `.env` do repositório. Todas as variáveis são
injetadas pela plataforma e os recursos são separados de staging. Nenhum
fallback local é aceito.

## Health checks

```text
GET /api/v1/health/live
GET /api/v1/health/ready
```

`live` verifica o processo. `ready` exige PostgreSQL e Redis disponíveis.
As respostas nunca incluem URLs ou credenciais das dependências.
