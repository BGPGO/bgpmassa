import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../config/database";
import type { Request, Response } from "express";

export const router = Router();

router.use(authenticate);

// GET /api/response-timers/:conversationId - Get active timer for a conversation
router.get("/:conversationId", async (req: Request, res: Response) => {
  const timer = await prisma.responseTimer.findFirst({
    where: { conversationId: req.params.conversationId, status: "RUNNING" },
    include: { alerts: true },
  });
  res.json(timer);
});
