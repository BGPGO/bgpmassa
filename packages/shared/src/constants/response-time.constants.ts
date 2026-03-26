export const RESPONSE_THRESHOLDS_MINUTES = [15, 30, 60, 120, 240] as const;
export type ResponseThreshold = (typeof RESPONSE_THRESHOLDS_MINUTES)[number];

/** Thresholds that trigger alert to ALL users of the instance (not just assigned agent) */
export const BROADCAST_ALERT_THRESHOLD_MINUTES = 60;
