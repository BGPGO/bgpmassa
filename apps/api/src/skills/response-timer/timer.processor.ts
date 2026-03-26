import type Bull from "bull";
import { prisma } from "../../config/database";
import { getIO } from "../../config/socket";
import { BROADCAST_ALERT_THRESHOLD_MINUTES } from "@bgpmassa/shared";
import type { ResponseTimeAlertEvent, ResponseThreshold } from "@bgpmassa/shared";
import { getTimerQueue } from "./timer.scheduler";

interface TimerJobData {
  conversationId: string;
  timerId: string;
  thresholdMinutes: number;
  instanceId: string;
}

export function initTimerProcessor(): void {
  const queue = getTimerQueue();

  queue.process(async (job: Bull.Job<TimerJobData>) => {
    const { conversationId, timerId, thresholdMinutes, instanceId } = job.data;

    // Check timer is still running
    const timer = await prisma.responseTimer.findUnique({ where: { id: timerId } });
    if (!timer || timer.status !== "RUNNING") {
      console.log(`[Timer] Job skipped — timer ${timerId} is no longer running`);
      return;
    }

    // Get conversation + contact info
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true, instance: true },
    });
    if (!conversation) return;

    // Find users to notify
    const permissions = await prisma.userInstancePermission.findMany({
      where: { instanceId, canRead: true },
      select: { userId: true },
    });
    const userIds = permissions.map((p) => p.userId);

    // Create notifications in DB
    const thresholdLabel = thresholdMinutes >= 60 ? `${thresholdMinutes / 60}h` : `${thresholdMinutes}min`;
    const notifType = getNotificationType(thresholdMinutes);

    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: notifType,
        title: `Sem resposta há ${thresholdLabel}`,
        body: `${conversation.contact.name || conversation.contact.phone} aguarda resposta há ${thresholdLabel}`,
        metadata: { conversationId, instanceId, thresholdMinutes },
      })),
    });

    // Record alert
    await prisma.responseAlert.create({
      data: { timerId, threshold: thresholdMinutes, notifiedUserIds: userIds },
    });

    // Emit Socket.io event
    const io = getIO();
    const event: ResponseTimeAlertEvent = {
      conversationId,
      instanceId,
      contactName: conversation.contact.name || conversation.contact.phone,
      contactPhone: conversation.contact.phone,
      thresholdMinutes: thresholdMinutes as ResponseThreshold,
      triggeredAt: new Date().toISOString(),
    };

    if (thresholdMinutes >= BROADCAST_ALERT_THRESHOLD_MINUTES) {
      // Broadcast to ALL users on this instance
      io.to(`instance:${instanceId}`).emit("alert:response_time", event);
    } else {
      // Emit only to relevant users
      for (const userId of userIds) {
        io.to(`user:${userId}`).emit("alert:response_time", event);
      }
    }

    console.log(`[Timer] Alert fired — conversation ${conversationId}, threshold ${thresholdMinutes}m`);
  });
}

function getNotificationType(minutes: number) {
  if (minutes === 15) return "RESPONSE_ALERT_15M" as const;
  if (minutes === 30) return "RESPONSE_ALERT_30M" as const;
  if (minutes === 60) return "RESPONSE_ALERT_1H" as const;
  if (minutes === 120) return "RESPONSE_ALERT_2H" as const;
  return "RESPONSE_ALERT_4H" as const;
}
