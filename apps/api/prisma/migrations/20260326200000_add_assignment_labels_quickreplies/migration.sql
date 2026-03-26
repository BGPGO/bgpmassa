-- Add assignedUserId and labels to conversations
ALTER TABLE "conversations" ADD COLUMN "assignedUserId" TEXT;
ALTER TABLE "conversations" ADD COLUMN "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create quick_replies table
CREATE TABLE "quick_replies" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_replies_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_instanceId_fkey"
  FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "quick_replies_instanceId_idx" ON "quick_replies"("instanceId");
