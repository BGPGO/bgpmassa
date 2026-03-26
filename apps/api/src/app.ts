import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { loadSkills } from "./skills";

export async function createApp(): Promise<express.Express> {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // Health check
  app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  // Auto-load all skills
  await loadSkills(app);

  app.use(errorHandler);

  return app;
}
