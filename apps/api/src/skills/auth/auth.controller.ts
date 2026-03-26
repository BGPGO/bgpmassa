import type { Request, Response } from "express";
import { login, logout, refresh } from "./auth.service";

export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email e password são obrigatórios" });
      return;
    }

    const { tokens, refreshToken } = await login(email, password);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ error: "Refresh token não encontrado" });
      return;
    }
    const tokens = await refresh(token);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (token) await logout(token);
  res.clearCookie("refreshToken");
  res.json({ ok: true });
}
