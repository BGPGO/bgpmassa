import { prisma } from "../../config/database";
import { ZApiClient } from "../../lib/zapi-client";
import { applySignature } from "./signature.service";
import { resolveTimer } from "../response-timer/timer.scheduler";
import { getIO } from "../../config/socket";

export async function listMessages(conversationId: string, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true, signature: true } } },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);
  return { items, total, page, limit };
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  rawBody: string
): Promise<unknown> {
  // Get conversation + instance
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { contact: true, instance: true },
  });

  // Apply user signature
  const { body, signatureApplied } = await applySignature(userId, rawBody);

  // Save message as PENDING first
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      direction: "OUTBOUND",
      type: "TEXT",
      body,
      signatureApplied,
      status: "PENDING",
    },
    include: { sender: { select: { id: true, name: true } } },
  });

  // Send via Z-API
  const zapiClient = new ZApiClient(
    conversation.instance.zapiInstanceId,
    conversation.instance.zapiToken
  );

  const result = await zapiClient.sendText({
    phone: conversation.contact.phone,
    message: body,
  }) as { messageId?: string };

  // Update message with Z-API message ID and SENT status
  const updated = await prisma.message.update({
    where: { id: message.id },
    data: {
      zapiMessageId: result.messageId || null,
      status: "SENT",
      sentAt: new Date(),
    },
    include: { sender: { select: { id: true, name: true } } },
  });

  // Update conversation lastMessageAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Resolve response timer
  await resolveTimer(conversationId);

  // Broadcast outbound message to instance room
  getIO().to(`instance:${conversation.instanceId}`).emit("message:new", {
    conversationId,
    message: updated,
  });

  return updated;
}
