import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../config/database";
import type { Request, Response } from "express";

export const router = Router();

router.use(authenticate);

// GET /api/auto-messages?instanceId=...
router.get("/", async (req: Request, res: Response) => {
  const { instanceId } = req.query;
  if (!instanceId) {
    res.status(400).json({ error: "instanceId é obrigatório" });
    return;
  }
  const items = await prisma.autoMessage.findMany({
    where: { instanceId: String(instanceId) },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

// POST /api/auto-messages
router.post("/", async (req: Request, res: Response) => {
  const { instanceId, name, trigger, body, delaySeconds = 0, isActive = true, conditions } = req.body;

  if (!instanceId || !name || !trigger || !body) {
    res.status(400).json({ error: "instanceId, name, trigger e body são obrigatórios" });
    return;
  }

  const perm = await prisma.userInstancePermission.findUnique({
    where: { userId_instanceId: { userId: req.user.sub, instanceId } },
  });
  if (!perm?.canManage && req.user.role !== "SUPERADMIN") {
    res.status(403).json({ error: "Sem permissão para gerenciar mensagens automáticas desta instância" });
    return;
  }

  const item = await prisma.autoMessage.create({
    data: { instanceId, name, trigger, body, delaySeconds, isActive, conditions },
  });
  res.status(201).json(item);
});

// PATCH /api/auto-messages/:id
router.patch("/:id", async (req: Request, res: Response) => {
  const { name, body, delaySeconds, isActive, conditions } = req.body;
  const updated = await prisma.autoMessage.update({
    where: { id: req.params.id },
    data: { name, body, delaySeconds, isActive, conditions },
  });
  res.json(updated);
});

// DELETE /api/auto-messages/:id
router.delete("/:id", async (req: Request, res: Response) => {
  await prisma.autoMessage.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
