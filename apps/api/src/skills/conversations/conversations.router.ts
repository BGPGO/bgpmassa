import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../config/database";
import type { Request, Response } from "express";

export const router = Router();

router.use(authenticate);

// GET /api/conversations - List conversations for accessible instances
router.get("/", async (req: Request, res: Response) => {
  const { instanceId, status, assignedTo, page = "1", limit = "30" } = req.query;

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

  // Assignment filter
  if (assignedTo === "me") {
    where.assignedUserId = req.user.sub;
  } else if (assignedTo === "unassigned") {
    where.assignedUserId = null;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        contact: true,
        instance: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
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
    include: {
      contact: true,
      instance: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
      responseTimers: {
        where: { status: "RUNNING" },
        take: 1,
      },
    },
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

// PATCH /api/conversations/:id/assign - Assign conversation to a user
router.patch("/:id/assign", async (req: Request, res: Response) => {
  const { userId } = req.body;

  // Validate user exists if userId provided
  if (userId !== null && userId !== undefined) {
    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
  }

  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data: { assignedUserId: userId ?? null },
    include: {
      contact: true,
      instance: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
    },
  });
  res.json(updated);
});

// PATCH /api/conversations/:id/labels - Update conversation labels
router.patch("/:id/labels", async (req: Request, res: Response) => {
  const { labels } = req.body;

  if (!Array.isArray(labels)) {
    res.status(400).json({ error: "labels deve ser um array" });
    return;
  }
  if (labels.length > 5) {
    res.status(400).json({ error: "Máximo de 5 labels permitidas" });
    return;
  }
  for (const label of labels) {
    if (typeof label !== "string") {
      res.status(400).json({ error: "Cada label deve ser uma string" });
      return;
    }
    if (label.length > 20) {
      res.status(400).json({ error: "Cada label pode ter no máximo 20 caracteres" });
      return;
    }
  }

  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data: { labels },
    include: {
      contact: true,
      instance: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
    },
  });
  res.json(updated);
});
