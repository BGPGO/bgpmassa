import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { listMessages, sendMessage } from "./messages.service";
import { prisma } from "../../config/database";
import type { Request, Response } from "express";

export const router = Router();

router.use(authenticate);

// GET /api/messages/:conversationId
router.get("/:conversationId", async (req: Request, res: Response) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.conversationId },
  });
  if (!conversation) {
    res.status(404).json({ error: "Conversa não encontrada" });
    return;
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  res.json(await listMessages(req.params.conversationId, page, limit));
});

// POST /api/messages/:conversationId - Send message
router.post(
  "/:conversationId",
  async (req: Request, res: Response) => {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.conversationId },
    });
    if (!conversation) {
      res.status(404).json({ error: "Conversa não encontrada" });
      return;
    }

    // Check write permission
    const perm = await prisma.userInstancePermission.findUnique({
      where: {
        userId_instanceId: { userId: req.user.sub, instanceId: conversation.instanceId },
      },
    });
    if (!perm?.canWrite && req.user.role !== "SUPERADMIN") {
      res.status(403).json({ error: "Sem permissão para enviar mensagens nesta instância" });
      return;
    }

    const { body } = req.body;
    if (!body?.trim()) {
      res.status(400).json({ error: "body é obrigatório" });
      return;
    }

    try {
      res.status(201).json(await sendMessage(req.params.conversationId, req.user.sub, body));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);
