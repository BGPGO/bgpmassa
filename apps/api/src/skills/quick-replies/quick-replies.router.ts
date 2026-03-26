import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../config/database";
import type { Request, Response } from "express";

export const router = Router();

router.use(authenticate);

// GET /api/quick-replies/suggest?instanceId=X — suggest from message history
router.get("/suggest", async (req: Request, res: Response) => {
  const { instanceId } = req.query;

  if (!instanceId) {
    res.status(400).json({ error: "instanceId é obrigatório" });
    return;
  }

  // Find top 20 most-sent outbound TEXT messages within this instance's conversations
  const results = await prisma.message.groupBy({
    by: ["body"],
    where: {
      direction: "OUTBOUND",
      type: "TEXT",
      conversation: {
        instanceId: String(instanceId),
      },
      body: {
        not: "",
      },
    },
    _count: {
      body: true,
    },
    orderBy: {
      _count: {
        body: "desc",
      },
    },
    take: 20,
  });

  const suggestions = results.map((r) => {
    const body = r.body;
    const count = r._count.body;
    const suggestedTitle = body.length > 30 ? body.substring(0, 30) : body;
    const firstWord = body.split(/\s+/)[0] ?? "";
    const suggestedShortcut = firstWord
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 15);

    return { body, count, suggestedTitle, suggestedShortcut };
  });

  res.json(suggestions);
});

// GET /api/quick-replies?instanceId=X — list quick replies accessible to user
router.get("/", async (req: Request, res: Response) => {
  const { instanceId } = req.query;

  const quickReplies = await prisma.quickReply.findMany({
    where: {
      isActive: true,
      OR: [
        { instanceId: null },
        ...(instanceId ? [{ instanceId: String(instanceId) }] : []),
      ],
    },
    orderBy: { title: "asc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      instance: { select: { id: true, name: true } },
    },
  });

  res.json(quickReplies);
});

// POST /api/quick-replies — create
router.post("/", async (req: Request, res: Response) => {
  const { title, shortcut, body, instanceId } = req.body;

  if (!title || !shortcut || !body) {
    res.status(400).json({ error: "title, shortcut e body são obrigatórios" });
    return;
  }

  const quickReply = await prisma.quickReply.create({
    data: {
      title: String(title),
      shortcut: String(shortcut),
      body: String(body),
      instanceId: instanceId ? String(instanceId) : null,
      createdById: req.user.sub,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      instance: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(quickReply);
});

// PATCH /api/quick-replies/:id — update
router.patch("/:id", async (req: Request, res: Response) => {
  const { title, shortcut, body, instanceId, isActive } = req.body;

  const existing = await prisma.quickReply.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404).json({ error: "Resposta rápida não encontrada" });
    return;
  }

  const updated = await prisma.quickReply.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title: String(title) }),
      ...(shortcut !== undefined && { shortcut: String(shortcut) }),
      ...(body !== undefined && { body: String(body) }),
      ...(instanceId !== undefined && { instanceId: instanceId ? String(instanceId) : null }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      instance: { select: { id: true, name: true } },
    },
  });

  res.json(updated);
});

// DELETE /api/quick-replies/:id — delete
router.delete("/:id", async (req: Request, res: Response) => {
  const existing = await prisma.quickReply.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404).json({ error: "Resposta rápida não encontrada" });
    return;
  }

  await prisma.quickReply.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
