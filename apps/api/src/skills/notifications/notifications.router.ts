import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../config/database";
import type { Request, Response } from "express";

export const router = Router();

router.use(authenticate);

// GET /api/notifications
router.get("/", async (req: Request, res: Response) => {
  const { unreadOnly, page = "1", limit = "30" } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: Record<string, unknown> = { userId: req.user.sub };
  if (unreadOnly === "true") where.readAt = null;

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user.sub, readAt: null } }),
  ]);

  res.json({ items, total, unreadCount, page: Number(page), limit: Number(limit) });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.sub },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

// PATCH /api/notifications/read-all
router.patch("/read-all", async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.sub, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});
