import { prisma } from "../../config/database";

/**
 * Returns the area IDs a user is allowed to see within an instance.
 * - ADMIN/SUPERADMIN → null (no restriction, see everything)
 * - AGENT/AREA_ADMIN → their own areas + cross-area visibility grants
 */
export async function getVisibleAreaIds(
  userId: string,
  userRole: string,
  instanceId?: string
): Promise<string[] | null> {
  if (["ADMIN", "SUPERADMIN"].includes(userRole)) return null;

  // Areas the user belongs to
  const userAreas = await prisma.userArea.findMany({
    where: { userId },
    select: { areaId: true },
  });

  // Cross-area visibility grants
  const visibilities = await prisma.userAreaVisibility.findMany({
    where: { userId },
    select: { visibleAreaId: true },
  });

  const areaIds = [
    ...userAreas.map((ua) => ua.areaId),
    ...visibilities.map((v) => v.visibleAreaId),
  ];

  // If instanceId provided, filter to areas of that instance only
  if (instanceId && areaIds.length > 0) {
    const instanceAreas = await prisma.area.findMany({
      where: { instanceId, id: { in: areaIds } },
      select: { id: true },
    });
    return instanceAreas.map((a) => a.id);
  }

  return [...new Set(areaIds)];
}

/**
 * Given a chat name, find which area it belongs to based on pattern matching.
 */
export async function resolveAreaByName(
  chatName: string,
  instanceId: string
): Promise<string | null> {
  if (!chatName) return null;

  const areas = await prisma.area.findMany({
    where: { instanceId },
    select: { id: true, patterns: true },
  });

  const nameLower = chatName.toLowerCase();
  for (const area of areas) {
    for (const pattern of area.patterns) {
      if (nameLower.includes(pattern.toLowerCase())) {
        return area.id;
      }
    }
  }

  return null;
}

/**
 * Check if a user has AREA_ADMIN role in a specific area.
 */
export async function isAreaAdmin(userId: string, areaId: string): Promise<boolean> {
  const membership = await prisma.userArea.findUnique({
    where: { userId_areaId: { userId, areaId } },
  });
  return membership?.role === "AREA_ADMIN";
}

/**
 * Calculate interaction history for a group/conversation.
 * Returns pairs of (inbound message → first outbound response) with response times.
 */
export async function getInteractionHistory(
  conversationId: string,
  from?: Date,
  to?: Date
) {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(from || to
        ? {
            sentAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { sentAt: "asc" },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  const interactions: Array<{
    inboundMessageId: string;
    inboundAt: Date | null;
    inboundBody: string;
    respondedBy: { id: string; name: string } | null;
    outboundMessageId: string | null;
    outboundAt: Date | null;
    responseTimeMinutes: number | null;
  }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.direction !== "INBOUND") continue;

    // Find the next OUTBOUND message after this INBOUND
    const response = messages.slice(i + 1).find((m) => m.direction === "OUTBOUND");

    const responseTimeMinutes =
      response?.sentAt && msg.sentAt
        ? Math.round(
            (new Date(response.sentAt).getTime() - new Date(msg.sentAt).getTime()) / 60000
          )
        : null;

    interactions.push({
      inboundMessageId: msg.id,
      inboundAt: msg.sentAt,
      inboundBody: msg.body.slice(0, 120),
      respondedBy: response?.sender ?? null,
      outboundMessageId: response?.id ?? null,
      outboundAt: response?.sentAt ?? null,
      responseTimeMinutes,
    });
  }

  return interactions;
}
