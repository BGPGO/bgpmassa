import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { listUsers, getUser, createUser, updateUser, deleteUser } from "./users.service";
import { prisma } from "../../config/database";
import type { Request, Response } from "express";

export const router = Router();

router.use(authenticate);

// GET /api/users - List all (admin only)
router.get("/", async (req: Request, res: Response) => {
  if (!["ADMIN", "SUPERADMIN"].includes(req.user.role)) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  res.json(await listUsers());
});

// GET /api/users/me - Current user profile
router.get("/me", async (req: Request, res: Response) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.sub },
    select: { id: true, email: true, name: true, signature: true, role: true, isActive: true, notificationsMuted: true, createdAt: true },
  });
  res.json(user);
});

// PATCH /api/users/me/mute-notifications - Toggle mute (AREA_ADMIN+ only)
router.patch("/me/mute-notifications", async (req: Request, res: Response) => {
  const userId = req.user.sub;
  const role = req.user.role;

  // ADMIN/SUPERADMIN always allowed; others need at least one AREA_ADMIN role
  if (!["ADMIN", "SUPERADMIN"].includes(role)) {
    const areaAdminEntry = await prisma.userArea.findFirst({
      where: { userId, role: "AREA_ADMIN" },
    });
    if (!areaAdminEntry) {
      res.status(403).json({ error: "Apenas administradores de área ou superiores podem silenciar notificações." });
      return;
    }
  }

  const { muted } = req.body as { muted: boolean };
  if (typeof muted !== "boolean") {
    res.status(400).json({ error: "Campo 'muted' deve ser boolean." });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { notificationsMuted: muted },
    select: { id: true, notificationsMuted: true },
  });
  res.json(updated);
});

// GET /api/users/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    res.json(await getUser(req.params.id));
  } catch {
    res.status(404).json({ error: "Usuário não encontrado" });
  }
});

// POST /api/users - Create user (admin only)
router.post("/", async (req: Request, res: Response) => {
  if (!["ADMIN", "SUPERADMIN"].includes(req.user.role)) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  try {
    res.status(201).json(await createUser(req.body));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// PATCH /api/users/:id - Update user
router.patch("/:id", async (req: Request, res: Response) => {
  const isAdmin = ["ADMIN", "SUPERADMIN"].includes(req.user.role);
  const isSelf = req.params.id === req.user.sub;

  if (!isAdmin && !isSelf) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  // Non-admins can only update their own name, signature, and password
  const allowedFields = isAdmin
    ? req.body
    : { name: req.body.name, signature: req.body.signature, password: req.body.password };

  try {
    res.json(await updateUser(req.params.id, allowedFields));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// DELETE /api/users/:id - Soft delete (admin only)
router.delete("/:id", async (req: Request, res: Response) => {
  if (!["ADMIN", "SUPERADMIN"].includes(req.user.role)) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  await deleteUser(req.params.id);
  res.json({ ok: true });
});
