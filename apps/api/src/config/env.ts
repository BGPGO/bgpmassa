import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  ZAPI_WEBHOOK_SECRET: z.string(),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // URL pública da API — usada para registrar webhooks no Z-API e exibir URLs corretas
  APP_URL: z.string().default("http://localhost:3001"),
});

export const env = schema.parse(process.env);
