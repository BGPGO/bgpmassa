import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { env } from "./env";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "./database";

let io: SocketServer;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");
      if (!token) return next(new Error("Unauthorized"));

      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;

    // Join personal room
    socket.join(`user:${userId}`);

    // Join all instance rooms the user has access to
    const permissions = await prisma.userInstancePermission.findMany({
      where: { userId, canRead: true },
      select: { instanceId: true },
    });
    for (const { instanceId } of permissions) {
      socket.join(`instance:${instanceId}`);
    }

    console.log(`[Socket] User ${userId} connected, joined ${permissions.length} instance rooms`);

    socket.on("disconnect", () => {
      console.log(`[Socket] User ${userId} disconnected`);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
