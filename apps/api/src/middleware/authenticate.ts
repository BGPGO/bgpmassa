import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "@bgpmassa/shared";
import { verifyAccessToken } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  try {
    const token = authHeader.slice(7);
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
