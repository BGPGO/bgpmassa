CREATE INDEX IF NOT EXISTS "conversations_instanceId_lastMessageAt_idx" ON "conversations"("instanceId", "lastMessageAt" DESC);
CREATE INDEX IF NOT EXISTS "conversations_status_idx" ON "conversations"("status");
CREATE INDEX IF NOT EXISTS "conversations_assignedUserId_idx" ON "conversations"("assignedUserId");
