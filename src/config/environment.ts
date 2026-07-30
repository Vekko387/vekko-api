export const APP_ENVIRONMENTS = [
  'development',
  'test',
  'staging',
  'production',
] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export function resolveEnvironment(
  value = process.env.NODE_ENV,
): AppEnvironment | undefined {
  if (!value) {
    return 'development';
  }

  return APP_ENVIRONMENTS.find((environment) => environment === value);
}

export function resolveEnvironmentFiles(): string[] {
  const environment = resolveEnvironment();

  if (environment !== 'development' && environment !== 'test') {
    return [];
  }

  return [`.env.${environment}.local`, `.env.${environment}`];
}

export function shouldIgnoreEnvironmentFiles(): boolean {
  const environment = resolveEnvironment();

  return environment !== 'development' && environment !== 'test';
}
