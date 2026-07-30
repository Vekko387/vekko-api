import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const infrastructureEnvPath = resolve('.env.infrastructure.local');
const applicationEnvPath = resolve('.env.development.local');
const testEnvPath = resolve('.env.test.local');

const environmentPaths = [
  infrastructureEnvPath,
  applicationEnvPath,
  testEnvPath,
];
const existingFiles = environmentPaths.filter(existsSync);
const shouldRotateSecrets = process.argv.includes('--force');

if (existingFiles.length === environmentPaths.length && !shouldRotateSecrets) {
  process.stdout.write(
    'Os arquivos locais de ambiente já existem. Nenhuma alteração foi feita.\n',
  );
  process.exit(0);
}

const parseEnvironment = (contents) =>
  Object.fromEntries(
    contents
      .split(/\r?\n/u)
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );

const createTestEnvironment = (postgresPassword, redisPassword) => {
  const encodedPostgresPassword = encodeURIComponent(postgresPassword);
  const encodedRedisPassword = encodeURIComponent(redisPassword);

  return [
    'NODE_ENV=test',
    'PORT=3000',
    'API_PREFIX=api/v1',
    'CORS_ORIGINS=',
    '',
    `DATABASE_URL=postgresql://vekko:${encodedPostgresPassword}@localhost:5433/vekko_test`,
    `REDIS_URL=redis://:${encodedRedisPassword}@localhost:6380/1`,
    'REDIS_KEY_PREFIX=vekko:test',
    'REDIS_CONNECT_TIMEOUT_MS=5000',
    '',
    'FIREBASE_PROJECT_ID=vekko-test',
    'FIREBASE_CLIENT_EMAIL=firebase-admin-test@vekko-test.iam.gserviceaccount.com',
    'FIREBASE_PRIVATE_KEY=not-used-because-firebase-is-mocked-in-tests',
    '',
    'DEPENDENCY_HEALTH_TIMEOUT_MS=2000',
    '',
    'THROTTLE_LIMIT=100',
    'THROTTLE_TTL_MS=60000',
    '',
  ].join('\n');
};

if (
  !shouldRotateSecrets &&
  existsSync(infrastructureEnvPath) &&
  existsSync(applicationEnvPath) &&
  !existsSync(testEnvPath)
) {
  const infrastructureEnvironment = parseEnvironment(
    readFileSync(infrastructureEnvPath, 'utf8'),
  );
  const postgresPassword = infrastructureEnvironment.POSTGRES_PASSWORD;
  const redisPassword = infrastructureEnvironment.REDIS_PASSWORD;

  if (!postgresPassword || !redisPassword) {
    throw new Error(
      'O ambiente de infraestrutura não contém as credenciais locais esperadas.',
    );
  }

  writeFileSync(
    testEnvPath,
    createTestEnvironment(postgresPassword, redisPassword),
    {
      encoding: 'utf8',
      flag: 'wx',
    },
  );
  process.stdout.write(
    'Ambiente de teste criado sem exibir credenciais. Nenhum arquivo existente foi alterado.\n',
  );
  process.exit(0);
}

if (existingFiles.length > 0 && !shouldRotateSecrets) {
  throw new Error(
    'Configuração local incompleta. Remova ou reconcilie os arquivos .env locais antes de executar novamente.',
  );
}

const createSecret = () => randomBytes(32).toString('base64url');
const postgresPassword = createSecret();
const redisPassword = createSecret();
const encodedPostgresPassword = encodeURIComponent(postgresPassword);
const encodedRedisPassword = encodeURIComponent(redisPassword);

const infrastructureEnvironment = [
  'POSTGRES_DB=vekko',
  'POSTGRES_USER=vekko',
  `POSTGRES_PASSWORD=${postgresPassword}`,
  'POSTGRES_PORT=5433',
  '',
  `REDIS_PASSWORD=${redisPassword}`,
  'REDIS_PORT=6380',
  '',
].join('\n');

const applicationEnvironment = [
  'NODE_ENV=development',
  'PORT=3000',
  'API_PREFIX=api/v1',
  'CORS_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:8081',
  '',
  `DATABASE_URL=postgresql://vekko:${encodedPostgresPassword}@localhost:5433/vekko`,
  `REDIS_URL=redis://:${encodedRedisPassword}@localhost:6380`,
  'REDIS_KEY_PREFIX=vekko:development',
  'REDIS_CONNECT_TIMEOUT_MS=5000',
  '',
  '# Preencha com uma conta de serviço exclusiva do Firebase development.',
  'FIREBASE_PROJECT_ID=',
  'FIREBASE_CLIENT_EMAIL=',
  'FIREBASE_PRIVATE_KEY=',
  '',
  'DEPENDENCY_HEALTH_TIMEOUT_MS=2000',
  '',
  'THROTTLE_LIMIT=100',
  'THROTTLE_TTL_MS=60000',
  '',
].join('\n');

writeFileSync(infrastructureEnvPath, infrastructureEnvironment, {
  encoding: 'utf8',
  flag: shouldRotateSecrets ? 'w' : 'wx',
});
writeFileSync(applicationEnvPath, applicationEnvironment, {
  encoding: 'utf8',
  flag: shouldRotateSecrets ? 'w' : 'wx',
});
writeFileSync(
  testEnvPath,
  createTestEnvironment(postgresPassword, redisPassword),
  {
    encoding: 'utf8',
    flag: shouldRotateSecrets ? 'w' : 'wx',
  },
);

process.stdout.write(
  shouldRotateSecrets
    ? 'Credenciais locais rotacionadas sem exibição. Configure o Firebase development e execute "pnpm infra:up".\n'
    : 'Ambiente local criado sem exibir credenciais. Configure o Firebase development e execute "pnpm infra:up".\n',
);
