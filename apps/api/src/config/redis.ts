import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err);
});

redis.on("connect", () => {
  console.log("[Redis] Connected");
});
