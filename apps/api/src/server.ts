import "dotenv/config";
import http from "http";
import { createApp } from "./app";
import { initSocket } from "./config/socket";
import { initTimerProcessor } from "./skills/response-timer/timer.processor";
import { env } from "./config/env";

async function bootstrap() {
  const app = await createApp();
  const httpServer = http.createServer(app);

  // Initialize Socket.io
  initSocket(httpServer);

  // Start Bull queue processors
  initTimerProcessor();

  httpServer.listen(env.PORT, () => {
    console.log(`[Server] Running on http://localhost:${env.PORT}`);
    console.log(`[Server] Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
