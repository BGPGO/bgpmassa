import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../config/database";
import { ZApiClient } from "../../lib/zapi-client";
import { resolveAreaByName } from "../areas/areas.service";
import crypto from "crypto";
import type { Request, Response } from "express";

export const router = Router();

router.use(authenticate);

// GET /api/instances - List instances the user has access to
router.get("/", async (req: Request, res: Response) => {
  const isAdmin = ["ADMIN", "SUPERADMIN"].includes(req.user.role);

  const instances = isAdmin
    ? await prisma.instance.findMany({
        select: { id: true, name: true, phoneNumber: true, status: true, zapiInstanceId: true, createdAt: true },
      })
    : await prisma.userInstancePermission.findMany({
        where: { userId: req.user.sub },
        include: {
          instance: {
            select: { id: true, name: true, phoneNumber: true, status: true, zapiInstanceId: true, createdAt: true },
          },
        },
      }).then((perms) => perms.map((p) => p.instance));

  res.json(instances);
});

// POST /api/instances - Create instance (admin only)
router.post("/", async (req: Request, res: Response) => {
  if (!["ADMIN", "SUPERADMIN"].includes(req.user.role)) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  const { name, zapiInstanceId, zapiToken } = req.body;
  if (!name || !zapiInstanceId || !zapiToken) {
    res.status(400).json({ error: "name, zapiInstanceId e zapiToken são obrigatórios" });
    return;
  }

  const instance = await prisma.instance.create({
    data: {
      name,
      zapiInstanceId,
      zapiToken,
      webhookSecret: crypto.randomBytes(32).toString("hex"),
    },
  });

  res.status(201).json(instance);
});

// GET /api/instances/:id/qrcode - Get QR code for connection
router.get("/:id/qrcode", async (req: Request, res: Response) => {
  const instance = await prisma.instance.findUnique({ where: { id: req.params.id } });
  if (!instance) {
    res.status(404).json({ error: "Instância não encontrada" });
    return;
  }

  try {
    const client = new ZApiClient(instance.zapiInstanceId, instance.zapiToken);
    const qr = await client.getQRCode();
    res.json(qr);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/instances/:id/status - Get connection status
router.get("/:id/status", async (req: Request, res: Response) => {
  const instance = await prisma.instance.findUnique({ where: { id: req.params.id } });
  if (!instance) {
    res.status(404).json({ error: "Instância não encontrada" });
    return;
  }

  try {
    const client = new ZApiClient(instance.zapiInstanceId, instance.zapiToken);
    const status = await client.getStatus();
    const newStatus = status.connected ? "CONNECTED" : "DISCONNECTED";
    await prisma.instance.update({ where: { id: instance.id }, data: { status: newStatus } });
    res.json({ ...status, status: newStatus });
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number; data: unknown }; message: string };
    console.error("[Status] Error:", axiosErr.response?.data || axiosErr.message);
    res.status(500).json({ error: axiosErr.message, detail: axiosErr.response?.data });
  }
});

// POST /api/instances/:id/sync - Pull all chats from Z-API and create contacts/conversations
router.post("/:id/sync", async (req: Request, res: Response) => {
  const instance = await prisma.instance.findUnique({ where: { id: req.params.id } });
  if (!instance) {
    res.status(404).json({ error: "Instância não encontrada" });
    return;
  }

  try {
    const client = new ZApiClient(instance.zapiInstanceId, instance.zapiToken);

    let page = 1;
    let imported = 0;
    let hasMore = true;

    while (hasMore) {
      const chats = (await client.getChats(page, 50)) as Array<{
        id?: string;
        chatId?: string;
        phone?: string;
        name?: string;
        lastMessage?: { body?: string; timestamp?: number };
        isGroup?: boolean;
        groupName?: string;
      }>;

      if (!chats || chats.length === 0) {
        hasMore = false;
        break;
      }

      for (const chat of chats) {
        const chatId = chat.id || chat.chatId || chat.phone;
        if (!chatId) continue;

        // Determine phone/name
        const phone = chatId.replace(/@.*$/, ""); // strip @c.us / @g.us
        const name = chat.isGroup ? (chat.groupName || chat.name || phone) : (chat.name || phone);

        // Upsert contact
        const contact = await prisma.contact.upsert({
          where: { phone },
          update: { name: name || undefined },
          create: { phone, name: name || null },
        });

        // Resolve area by chat name
        const areaId = await resolveAreaByName(name || phone, instance.id);

        // Upsert conversation
        const lastMsgAt = chat.lastMessage?.timestamp
          ? new Date(chat.lastMessage.timestamp * 1000)
          : undefined;

        await prisma.conversation.upsert({
          where: { instanceId_zapiChatId: { instanceId: instance.id, zapiChatId: chatId } },
          update: { lastMessageAt: lastMsgAt, ...(areaId ? { areaId } : {}) },
          create: {
            instanceId: instance.id,
            contactId: contact.id,
            zapiChatId: chatId,
            status: "OPEN",
            lastMessageAt: lastMsgAt,
            ...(areaId ? { areaId } : {}),
          },
        });

        imported++;
      }

      // Z-API /chats pagination: if fewer than requested, we're done
      if (chats.length < 50) {
        hasMore = false;
      } else {
        page++;
      }
    }

    res.json({ ok: true, imported });
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number; data: unknown }; message: string };
    console.error("[Sync] Error:", axiosErr.response?.data || axiosErr.message);
    res.status(500).json({
      error: axiosErr.message,
      detail: axiosErr.response?.data,
    });
  }
});

// DELETE /api/instances/:id (admin only)
router.delete("/:id", async (req: Request, res: Response) => {
  if (!["ADMIN", "SUPERADMIN"].includes(req.user.role)) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  await prisma.instance.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
