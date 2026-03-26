export const PERMISSIONS = {
  READ: "canRead",
  WRITE: "canWrite",
  MANAGE: "canManage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
