import type { ResponseThreshold } from "../constants/response-time.constants";

export interface ResponseTimeAlertEvent {
  conversationId: string;
  instanceId: string;
  contactName: string;
  contactPhone: string;
  thresholdMinutes: ResponseThreshold;
  triggeredAt: string; // ISO date
}

export interface SocketEvents {
  "message:new": { conversationId: string; message: unknown };
  "alert:response_time": ResponseTimeAlertEvent;
  "instance:status": { instanceId: string; status: string };
  "notification:new": { notificationId: string };
}
