import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import type { UserRole } from "@bgpmassa/shared";

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, signature: true, role: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });
}

export async function getUser(id: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: { id: true, email: true, name: true, signature: true, role: true, isActive: true, createdAt: true },
  });
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  signature?: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: { email: data.email, passwordHash, name: data.name, role: data.role, signature: data.signature },
    select: { id: true, email: true, name: true, role: true, signature: true, createdAt: true },
  });
}

export async function updateUser(
  id: string,
  data: { name?: string; signature?: string; isActive?: boolean; password?: string }
) {
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.signature !== undefined) update.signature = data.signature;
  if (data.isActive !== undefined) update.isActive = data.isActive;
  if (data.password) update.passwordHash = await bcrypt.hash(data.password, 12);

  return prisma.user.update({ where: { id }, data: update });
}

export async function deleteUser(id: string) {
  return prisma.user.update({ where: { id }, data: { isActive: false } });
}
