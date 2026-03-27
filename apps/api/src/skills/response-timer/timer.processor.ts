import type Bull from "bull";
import { prisma } from "../../config/database";
import { getIO } from "../../config/socket";
import { BROADCAST_ALERT_THRESHOLD_MINUTES } from "@bgpmassa/shared";
import type { ResponseTimeAlertEvent, ResponseThreshold } from "@bgpmassa/shared";
import { getTimerQueue, startRepeatAlert } from "./timer.scheduler";

interface TimerJobData {
  conversationId: string;
  timerId: string;
  thresholdMinutes: number;
  instanceId: string;
  isRepeatAlert?: boolean;
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

    // Find users to notify — exclude those with notifications muted (only AREA_ADMIN+ can mute)
    const permissions = await prisma.userInstancePermission.findMany({
      where: { instanceId, canRead: true },
      select: { userId: true },
    });
    const allUserIds = permissions.map((p) => p.userId);

    // Filter out muted users (only allowed to mute if they have an area admin role or above)
    const mutedUsers = await prisma.user.findMany({
      where: { id: { in: allUserIds }, notificationsMuted: true },
      select: { id: true },
    });
    const mutedIds = new Set(mutedUsers.map((u) => u.id));
    const userIds = allUserIds.filter((id) => !mutedIds.has(id));

    // Create notifications in DB (only for non-muted users, skip DB spam on repeats)
    const thresholdLabel = thresholdMinutes >= 60 ? `${thresholdMinutes / 60}h` : `${thresholdMinutes}min`;
    const notifType = getNotificationType(thresholdMinutes);

    // For repeat alerts (every-minute after 1h), only emit socket — don't flood DB
    if (!job.data.isRepeatAlert && userIds.length > 0) {
      await prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: notifType,
          title: `Sem resposta há ${thresholdLabel}`,
          body: `${conversation.contact.name || conversation.contact.phone} aguarda resposta há ${thresholdLabel}`,
          metadata: { conversationId, instanceId, thresholdMinutes },
        })),
      });

      await prisma.responseAlert.create({
        data: { timerId, threshold: thresholdMinutes, notifiedUserIds: userIds },
      });
    }

    // Emit Socket.io event to non-muted users
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
      // For the 1h+ threshold: emit to all non-muted users individually
      for (const userId of allUserIds) {
        if (!mutedIds.has(userId)) {
          io.to(`user:${userId}`).emit("alert:response_time", event);
        }
      }
    } else {
      for (const userId of userIds) {
        io.to(`user:${userId}`).emit("alert:response_time", event);
      }
    }

    // After the first 1h alert fires, start the every-minute repeat job
    if (thresholdMinutes === 60 && !job.data.isRepeatAlert) {
      await startRepeatAlert(conversationId, timerId, instanceId);
    }

    console.log(`[Timer] Alert fired — conversation ${conversationId}, threshold ${thresholdMinutes}m${job.data.isRepeatAlert ? " (repeat)" : ""}`);
  });
}

function getNotificationType(minutes: number) {
  if (minutes === 15) return "RESPONSE_ALERT_15M" as const;
  if (minutes === 30) return "RESPONSE_ALERT_30M" as const;
  if (minutes === 60) return "RESPONSE_ALERT_1H" as const;
  if (minutes === 120) return "RESPONSE_ALERT_2H" as const;
  return "RESPONSE_ALERT_4H" as const;
}
