import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../config/database";
import type { Request, Response } from "express";

export const router = Router();

router.use(authenticate);

const requireAdmin = (req: Request, res: Response, next: () => void) => {
  if (!["ADMIN", "SUPERADMIN"].includes(req.user.role)) {
    res.status(403).json({ error: "Somente admins podem gerenciar permissões" });
    return;
  }
  next();
};

// GET /api/permissions?instanceId=...&userId=...
router.get("/", requireAdmin, async (req: Request, res: Response) => {
  const where: Record<string, string> = {};
  if (req.query.instanceId) where.instanceId = String(req.query.instanceId);
  if (req.query.userId) where.userId = String(req.query.userId);

  const perms = await prisma.userInstancePermission.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      instance: { select: { id: true, name: true } },
    },
  });
  res.json(perms);
});

// POST /api/permissions - Grant or update permission
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const { userId, instanceId, canRead = true, canWrite = false, canManage = false } = req.body;
  if (!userId || !instanceId) {
    res.status(400).json({ error: "userId e instanceId são obrigatórios" });
    return;
  }

  const perm = await prisma.userInstancePermission.upsert({
    where: { userId_instanceId: { userId, instanceId } },
    create: { userId, instanceId, canRead, canWrite, canManage },
    update: { canRead, canWrite, canManage },
    include: {
      user: { select: { id: true, name: true } },
      instance: { select: { id: true, name: true } },
    },
  });
  res.json(perm);
});

// DELETE /api/permissions/:userId/:instanceId - Revoke permission
router.delete("/:userId/:instanceId", requireAdmin, async (req: Request, res: Response) => {
  await prisma.userInstancePermission.delete({
    where: { userId_instanceId: { userId: req.params.userId, instanceId: req.params.instanceId } },
  });
  res.json({ ok: true });
});
