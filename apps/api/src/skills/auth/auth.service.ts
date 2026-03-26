import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt";
import type { AuthTokens } from "@bgpmassa/shared";

export async function login(
  email: string,
  password: string
): Promise<{ tokens: AuthTokens; refreshToken: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new Error("Credenciais inválidas");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("Credenciais inválidas");

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken(user.id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

  return { tokens: { accessToken }, refreshToken };
}

export async function refresh(token: string): Promise<AuthTokens> {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) throw new Error("Refresh token inválido");

  const payload = verifyRefreshToken(token);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  return { accessToken };
}

export async function logout(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } });
}
