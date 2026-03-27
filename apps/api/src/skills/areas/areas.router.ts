import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../config/database";
import { isAreaAdmin, getInteractionHistory } from "./areas.service";
import type { Request, Response, NextFunction } from "express";

export const router = Router();

router.use(authenticate);

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!["ADMIN", "SUPERADMIN"].includes(req.user.role)) {
    res.status(403).json({ error: "Acesso negado: requer ADMIN ou superior" });
    return;
  }
  next();
}

// ─── AREAS CRUD ──────────────────────────────────────────────────────────────

// GET /api/areas?instanceId=...
router.get("/", async (req: Request, res: Response) => {
  const { instanceId } = req.query;
  const isAdmin = ["ADMIN", "SUPERADMIN"].includes(req.user.role);

  if (isAdmin) {
    const areas = await prisma.area.findMany({
      where: instanceId ? { instanceId: String(instanceId) } : undefined,
      include: {
        _count: { select: { userAreas: true, conversations: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(areas);
    return;
  }

  // Non-admin: only their own areas
  const userAreas = await prisma.userArea.findMany({
    where: { userId: req.user.sub },
    include: {
      area: {
        include: { _count: { select: { userAreas: true, conversations: true } } },
      },
    },
  });

  res.json(userAreas.map((ua) => ({ ...ua.area, myRole: ua.role })));
});

// POST /api/areas
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const { instanceId, name, patterns } = req.body;
  if (!instanceId || !name) {
    res.status(400).json({ error: "instanceId e name são obrigatórios" });
    return;
  }

  const area = await prisma.area.create({
    data: {
      instanceId,
      name,
      patterns: patterns ?? [],
    },
  });
  res.status(201).json(area);
});

// PATCH /api/areas/:id
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  const { name, patterns } = req.body;
  const area = await prisma.area.update({
    where: { id: req.params.id },
    data: {
      ...(name ? { name } : {}),
      ...(patterns !== undefined ? { patterns } : {}),
    },
  });
  res.json(area);
});

// DELETE /api/areas/:id
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  await prisma.area.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ─── MEMBROS ─────────────────────────────────────────────────────────────────

// GET /api/areas/:id/members
router.get("/:id/members", async (req: Request, res: Response) => {
  const isAdmin = ["ADMIN", "SUPERADMIN"].includes(req.user.role);
  const userIsAreaAdmin = await isAreaAdmin(req.user.sub, req.params.id);

  if (!isAdmin && !userIsAreaAdmin) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  const members = await prisma.userArea.findMany({
    where: { areaId: req.params.id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  res.json(members);
});

// POST /api/areas/:id/members — { userId, role }
router.post("/:id/members", requireAdmin, async (req: Request, res: Response) => {
  const { userId, role } = req.body;
  if (!userId) {
    res.status(400).json({ error: "userId é obrigatório" });
    return;
  }

  const membership = await prisma.userArea.upsert({
    where: { userId_areaId: { userId, areaId: req.params.id } },
    update: { role: role ?? "MEMBER" },
    create: { userId, areaId: req.params.id, role: role ?? "MEMBER" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json(membership);
});

// PATCH /api/areas/:id/members/:userId — change role
router.patch("/:id/members/:userId", requireAdmin, async (req: Request, res: Response) => {
  const { role } = req.body;
  if (!["MEMBER", "AREA_ADMIN"].includes(role)) {
    res.status(400).json({ error: "Role inválido. Use MEMBER ou AREA_ADMIN" });
    return;
  }

  const updated = await prisma.userArea.update({
    where: { userId_areaId: { userId: req.params.userId, areaId: req.params.id } },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(updated);
});

// DELETE /api/areas/:id/members/:userId
router.delete("/:id/members/:userId", requireAdmin, async (req: Request, res: Response) => {
  await prisma.userArea.delete({
    where: { userId_areaId: { userId: req.params.userId, areaId: req.params.id } },
  });
  res.json({ ok: true });
});

// ─── VISIBILIDADE CROSS-AREA ─────────────────────────────────────────────────

// POST /api/areas/:id/visibility — { userId } grant cross-area visibility
router.post("/:id/visibility", requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: "userId é obrigatório" });
    return;
  }

  const vis = await prisma.userAreaVisibility.upsert({
    where: { userId_visibleAreaId: { userId, visibleAreaId: req.params.id } },
    update: {},
    create: { userId, visibleAreaId: req.params.id, grantedById: req.user.sub },
    include: {
      user: { select: { id: true, name: true, email: true } },
      visibleArea: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(vis);
});

// GET /api/areas/:id/visibility — list who has cross-area access to this area
router.get("/:id/visibility", requireAdmin, async (req: Request, res: Response) => {
  const visibilities = await prisma.userAreaVisibility.findMany({
    where: { visibleAreaId: req.params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      grantedBy: { select: { id: true, name: true } },
    },
  });
  res.json(visibilities);
});

// DELETE /api/areas/:id/visibility/:userId
router.delete("/:id/visibility/:userId", requireAdmin, async (req: Request, res: Response) => {
  await prisma.userAreaVisibility.delete({
    where: {
      userId_visibleAreaId: { userId: req.params.userId, visibleAreaId: req.params.id },
    },
  });
  res.json({ ok: true });
});

// ─── HISTÓRICO DE INTERAÇÃO ─────────────────────────────────────────────────

// GET /api/areas/:id/interaction-history?from=&to=&conversationId=
router.get("/:id/interaction-history", async (req: Request, res: Response) => {
  const areaId = req.params.id;
  const isAdmin = ["ADMIN", "SUPERADMIN"].includes(req.user.role);
  const userIsAreaAdmin = await isAreaAdmin(req.user.sub, areaId);

  if (!isAdmin && !userIsAreaAdmin) {
    res.status(403).json({ error: "Acesso negado: requer AREA_ADMIN ou superior" });
    return;
  }

  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const specificConversationId = req.query.conversationId
    ? String(req.query.conversationId)
    : undefined;

  // If a specific conversation is requested, just return its history
  if (specificConversationId) {
    // Verify the conversation belongs to this area
    const conv = await prisma.conversation.findFirst({
      where: { id: specificConversationId, areaId },
      include: { contact: true },
    });
    if (!conv) {
      res.status(404).json({ error: "Conversa não encontrada nesta área" });
      return;
    }
    const history = await getInteractionHistory(specificConversationId, from, to);
    res.json({
      conversationId: specificConversationId,
      contact: conv.contact,
      interactions: history,
    });
    return;
  }

  // Return summary per conversation
  const conversations = await prisma.conversation.findMany({
    where: { areaId },
    include: { contact: true },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });

  const results = await Promise.all(
    conversations.map(async (conv) => {
      const interactions = await getInteractionHistory(conv.id, from, to);
      const avgResponseTime =
        interactions.length > 0
          ? Math.round(
              interactions
                .filter((i) => i.responseTimeMinutes !== null)
                .reduce((sum, i) => sum + (i.responseTimeMinutes ?? 0), 0) /
                Math.max(interactions.filter((i) => i.responseTimeMinutes !== null).length, 1)
            )
          : null;

      return {
        conversationId: conv.id,
        contactName: conv.contact.name || conv.contact.phone,
        contactPhone: conv.contact.phone,
        totalInteractions: interactions.length,
        avgResponseTimeMinutes: avgResponseTime,
        lastInteraction: interactions[interactions.length - 1] ?? null,
      };
    })
  );

  res.json(results);
});
