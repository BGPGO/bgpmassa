import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../config/database";
import type { Request, Response } from "express";

export const router = Router();

router.use(authenticate);

// GET /api/conversations - List conversations for accessible instances
router.get("/", async (req: Request, res: Response) => {
  const { instanceId, status, page = "1", limit = "30" } = req.query;

  // Find instances the user can access
  let allowedInstanceIds: string[];
  if (["ADMIN", "SUPERADMIN"].includes(req.user.role)) {
    const all = await prisma.instance.findMany({ select: { id: true } });
    allowedInstanceIds = all.map((i) => i.id);
  } else {
    const perms = await prisma.userInstancePermission.findMany({
      where: { userId: req.user.sub, canRead: true },
      select: { instanceId: true },
    });
    allowedInstanceIds = perms.map((p) => p.instanceId);
  }

  const where: Record<string, unknown> = {
    instanceId: instanceId ? String(instanceId) : { in: allowedInstanceIds },
  };
  if (status) where.status = String(status);

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        contact: true,
        instance: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        responseTimers: {
          where: { status: "RUNNING" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.conversation.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

// GET /api/conversations/:id
router.get("/:id", async (req: Request, res: Response) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: { contact: true, instance: { select: { id: true, name: true } } },
  });
  if (!conversation) {
    res.status(404).json({ error: "Conversa não encontrada" });
    return;
  }
  res.json(conversation);
});

// PATCH /api/conversations/:id/status - Change conversation status
router.patch("/:id/status", async (req: Request, res: Response) => {
  const { status } = req.body;
  const validStatuses = ["OPEN", "PENDING", "RESOLVED", "ARCHIVED"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Status inválido" });
    return;
  }

  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(updated);
});
