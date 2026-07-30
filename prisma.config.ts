import { config as loadEnvironment } from 'dotenv';
import { defineConfig } from 'prisma/config';

const environment = process.env.NODE_ENV ?? 'development';

if (environment === 'development' || environment === 'test') {
  loadEnvironment({
    path: [`.env.${environment}.local`, `.env.${environment}`],
    quiet: true,
  });
}

const isGenerateCommand = process.argv.includes('generate');
const databaseUrl =
  process.env.DATABASE_URL ??
  (isGenerateCommand
    ? 'postgresql://generate-only:generate-only@localhost:5432/generate-only'
    : undefined);

if (!databaseUrl) {
  throw new Error(
    `DATABASE_URL is required to run Prisma in ${environment}.`,
  );
}

export default defineConfig({
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
