import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { prisma } from "../../config/database";
import { ZApiClient } from "../../lib/zapi-client";
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
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
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
