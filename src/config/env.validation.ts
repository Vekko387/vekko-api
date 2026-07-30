import Joi from 'joi';

export const envValidationSchema = Joi.object({
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  DEPENDENCY_HEALTH_TIMEOUT_MS: Joi.number()
    .integer()
    .positive()
    .default(2_000),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().min(1).required(),
  FIREBASE_PROJECT_ID: Joi.string().trim().min(1).required(),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  REDIS_CONNECT_TIMEOUT_MS: Joi.number().integer().positive().default(5_000),
  REDIS_KEY_PREFIX: Joi.string().default('vekko:development'),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(100),
  THROTTLE_TTL_MS: Joi.number().integer().positive().default(60_000),
});
