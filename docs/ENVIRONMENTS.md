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

Cada ambiente usa um projeto Firebase e uma conta de serviço próprios. Preencha
em `.env.development.local`:

```text
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_WEB_API_KEY=
```

`FIREBASE_PRIVATE_KEY` aceita as quebras de linha escapadas como `\n`. Nunca
adicione o JSON da conta de serviço ao Git.

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
FIREBASE_PROJECT_ID=<firebase-staging-project-id>
FIREBASE_CLIENT_EMAIL=<firebase-staging-client-email>
FIREBASE_PRIVATE_KEY=<firebase-staging-private-key>
FIREBASE_WEB_API_KEY=<firebase-staging-web-api-key>
DEPENDENCY_HEALTH_TIMEOUT_MS=2000
THROTTLE_LIMIT=100
THROTTLE_TTL_MS=60000
```

`CORS_ORIGINS` deve receber somente os domínios reais dos frontends de staging.
Enquanto estiver vazio, chamadas cross-origin permanecem bloqueadas.

As credenciais da conta de serviço devem ser secrets do `vekko-api`. A
`FIREBASE_WEB_API_KEY` é a chave pública do app Web de staging e é usada para o
Firebase enviar o e-mail padrão de definição de senha depois da aprovação de um
parceiro. Use uma conta de serviço exclusiva de staging e habilite o provider
Email/Senha no Firebase Authentication.

Depois do deploy, usuários internos são provisionados somente pelo shell do
serviço no Railway. O comando confirma que o UID existe no Firebase de staging
antes de gravar a role no PostgreSQL:

```text
node dist/cli/provision-staging-user.js --firebase-uid <uid> --role PARTNER_OWNER
node dist/cli/provision-staging-user.js --firebase-uid <uid> --role ADMIN
```

O comando é bloqueado fora de `NODE_ENV=staging` e não aceita `CUSTOMER`.

O Railway executa as migrations no pre-deploy e valida:

```text
/api/v1/health/ready
```

## Production

Produção não utiliza arquivos `.env` do repositório. Todas as variáveis são
injetadas pela plataforma e os recursos são separados de staging. Nenhum
fallback local é aceito.

O projeto Firebase e a conta de serviço de produção também devem ser exclusivos
desse ambiente. O provisionador deste bloco permanece desabilitado em produção.

## Health checks

```text
GET /api/v1/health/live
GET /api/v1/health/ready
```

`live` verifica o processo. `ready` exige PostgreSQL e Redis disponíveis.
As respostas nunca incluem URLs ou credenciais das dependências.
