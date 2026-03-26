import { prisma } from "../../config/database";
import { getIO } from "../../config/socket";
import { startTimer, resolveTimer } from "../response-timer/timer.scheduler";
import type { ZApiWebhookPayload } from "@bgpmassa/shared";

export async function handleInboundMessage(
  payload: ZApiWebhookPayload,
  instanceId: string
): Promise<void> {
  // Upsert contact
  const contact = await prisma.contact.upsert({
    where: { phone: payload.phone },
    create: {
      phone: payload.phone,
      name: payload.senderName || undefined,
      avatarUrl: payload.senderPhoto || undefined,
    },
    update: {
      name: payload.senderName || undefined,
      avatarUrl: payload.senderPhoto || undefined,
    },
  });

  // Upsert conversation
  const conversation = await prisma.conversation.upsert({
    where: { instanceId_zapiChatId: { instanceId, zapiChatId: payload.chatId } },
    create: {
      instanceId,
      contactId: contact.id,
      zapiChatId: payload.chatId,
      status: "OPEN",
      lastMessageAt: new Date(payload.momment),
    },
    update: {
      lastMessageAt: new Date(payload.momment),
      status: "OPEN",
    },
  });

  // Save message
  const body = extractBody(payload);
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      zapiMessageId: payload.messageId,
      direction: "INBOUND",
      type: mapMessageType(payload.type),
      body,
      status: "DELIVERED",
      sentAt: new Date(payload.momment),
    },
    include: { sender: { select: { id: true, name: true, signature: true } } },
  });

  // Broadcast to instance room via Socket.io
  getIO().to(`instance:${instanceId}`).emit("message:new", {
    conversationId: conversation.id,
    message,
  });

  // Start SLA response timer
  await startTimer(conversation.id, instanceId);
}

export async function handleOutboundMessage(
  payload: ZApiWebhookPayload,
  instanceId: string
): Promise<void> {
  // Update message status if we have the zapiMessageId
  if (payload.messageId) {
    await prisma.message.updateMany({
      where: { zapiMessageId: payload.messageId },
      data: { status: mapStatus(payload.status), sentAt: new Date(payload.momment) },
    });
  }

  // Find conversation and resolve its timer
  const conversation = await prisma.conversation.findFirst({
    where: { instanceId, zapiChatId: payload.chatId },
  });

  if (conversation) {
    await resolveTimer(conversation.id);
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(payload.momment) },
    });
  }
}

function extractBody(payload: ZApiWebhookPayload): string {
  if (payload.text?.message) return payload.text.message;
  if (payload.image?.caption) return payload.image.caption;
  if (payload.video?.caption) return payload.video.caption;
  if (payload.document?.fileName) return `[Documento: ${payload.document.fileName}]`;
  if (payload.audio) return "[Áudio]";
  if (payload.sticker) return "[Figurinha]";
  if (payload.location) return `[Localização: ${payload.location.name || ""}]`;
  return "[Mensagem]";
}

function mapMessageType(type: string) {
  const map: Record<string, string> = {
    text: "TEXT",
    image: "IMAGE",
    audio: "AUDIO",
    video: "VIDEO",
    document: "DOCUMENT",
    sticker: "STICKER",
    location: "LOCATION",
  };
  return (map[type] || "TEXT") as "TEXT";
}

function mapStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: "PENDING",
    SENT: "SENT",
    RECEIVED: "DELIVERED",
    READ: "READ",
  };
  return (map[status] || "SENT") as "SENT";
}
