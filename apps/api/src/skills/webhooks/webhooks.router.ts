import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../../config/database";
import { handleInboundMessage, handleOutboundMessage } from "./webhooks.service";
import type { ZApiWebhookPayload } from "@bgpmassa/shared";

export const router = Router();

/**
 * POST /api/webhooks/zapi/:instanceId
 *
 * Z-API sends all events to this endpoint.
 * The instanceId in the URL identifies which of our instances the event belongs to.
 */
router.post("/zapi/:instanceId", async (req: Request, res: Response) => {
  const { instanceId } = req.params;

  // Validate instance exists
  const instance = await prisma.instance.findUnique({ where: { zapiInstanceId: instanceId } });
  if (!instance) {
    res.status(404).json({ error: "Instância não encontrada" });
    return;
  }

  const payload = req.body as ZApiWebhookPayload;

  try {
    if (!payload.fromMe) {
      await handleInboundMessage(payload, instance.id);
    } else {
      await handleOutboundMessage(payload, instance.id);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[Webhook] Error processing event:", err);
    res.status(500).json({ error: "Erro ao processar webhook" });
  }
});
