import Joi from 'joi';

export const envValidationSchema = Joi.object({
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default(
    'http://localhost:3001,http://localhost:3002,http://localhost:8081',
  ),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .default('postgresql://postgres:postgres@localhost:5432/vekko'),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  REDIS_KEY_PREFIX: Joi.string().default('vekko'),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .default('redis://localhost:6379'),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(100),
  THROTTLE_TTL_MS: Joi.number().integer().positive().default(60_000),
});
