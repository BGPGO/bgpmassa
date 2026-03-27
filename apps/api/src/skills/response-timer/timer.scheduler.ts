import Bull from "bull";
import { prisma } from "../../config/database";
import { redis } from "../../config/redis";
import { RESPONSE_THRESHOLDS_MINUTES } from "@bgpmassa/shared";

let timerQueue: Bull.Queue;

export function getTimerQueue(): Bull.Queue {
  if (!timerQueue) {
    timerQueue = new Bull("response-timer-queue", { createClient: () => redis.duplicate() });
  }
  return timerQueue;
}

interface TimerJobData {
  conversationId: string;
  timerId: string;
  thresholdMinutes: number;
  instanceId: string;
}

/**
 * Called when an INBOUND message arrives.
 * Cancels any active timer and starts a fresh one with 5 delayed alert jobs.
 */
export async function startTimer(conversationId: string, instanceId: string): Promise<void> {
  const queue = getTimerQueue();

  // Cancel previous running timer for this conversation
  await cancelTimer(conversationId);

  // Create new timer record
  const timer = await prisma.responseTimer.create({
    data: { conversationId, status: "RUNNING" },
  });

  // Schedule one job per threshold
  for (const minutes of RESPONSE_THRESHOLDS_MINUTES) {
    const jobData: TimerJobData = { conversationId, timerId: timer.id, thresholdMinutes: minutes, instanceId };
    await queue.add(jobData, {
      delay: minutes * 60 * 1000,
      jobId: `alert:${conversationId}:${minutes}`,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  console.log(`[Timer] Started for conversation ${conversationId}`);
}

/**
 * Called when an OUTBOUND message is sent.
 * Resolves the active timer and removes pending alert jobs.
 */
export async function resolveTimer(conversationId: string): Promise<void> {
  const queue = getTimerQueue();

  const timer = await prisma.responseTimer.findFirst({
    where: { conversationId, status: "RUNNING" },
  });

  if (!timer) return;

  await prisma.responseTimer.update({
    where: { id: timer.id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  // Remove pending jobs for this conversation
  for (const minutes of RESPONSE_THRESHOLDS_MINUTES) {
    const job = await queue.getJob(`alert:${conversationId}:${minutes}`);
    await job?.remove();
  }

  // Remove the repeating every-minute job
  await removeRepeatAlert(conversationId);

  console.log(`[Timer] Resolved for conversation ${conversationId}`);
}

async function cancelTimer(conversationId: string): Promise<void> {
  const queue = getTimerQueue();

  await prisma.responseTimer.updateMany({
    where: { conversationId, status: "RUNNING" },
    data: { status: "CANCELLED" },
  });

  for (const minutes of RESPONSE_THRESHOLDS_MINUTES) {
    const job = await queue.getJob(`alert:${conversationId}:${minutes}`);
    await job?.remove();
  }

  // Remove the repeating every-minute job if it exists
  await removeRepeatAlert(conversationId);
}

export async function startRepeatAlert(
  conversationId: string,
  timerId: string,
  instanceId: string
): Promise<void> {
  const queue = getTimerQueue();

  const jobData = { conversationId, timerId, thresholdMinutes: 60, instanceId, isRepeatAlert: true };

  await queue.add(jobData, {
    repeat: { every: 60 * 1000 }, // fires every 60 seconds
    jobId: `alert:repeat:${conversationId}`,
    removeOnComplete: true,
  });
}

export async function removeRepeatAlert(conversationId: string): Promise<void> {
  const queue = getTimerQueue();
  try {
    const repeatableJobs = await queue.getRepeatableJobs();
    const job = repeatableJobs.find((j) => j.key.includes(`alert:repeat:${conversationId}`));
    if (job) await queue.removeRepeatableByKey(job.key);
  } catch {
    // Ignore if not found
  }
}
